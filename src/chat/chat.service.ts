import {
	ForbiddenException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import { ConversationType, MemberRole } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

const MEMBER_SELECT = {
	select: {
		user: {
			select: {
				id: true,
				username: true,
				fullname: true,
				avatarUrl: true,
				isOnline: true,
				lastSeenAt: true
			}
		},
		role: true
	}
} as const

@Injectable()
export class ChatService {
	constructor(private readonly prisma: PrismaService) {}

	async assertMember(conversationId: number, userId: number) {
		const member = await this.prisma.conversationMember.findUnique({
			where: { conversationId_userId: { conversationId, userId } }
		})
		if (!member) {
			throw new ForbiddenException('You are not a member of this conversation')
		}
		return member
	}

	async getOrCreateDirectConversation(
		currentUserId: number,
		otherUserId: number
	) {
		if (currentUserId === otherUserId) {
			throw new ForbiddenException(
				'Cannot start a direct conversation with yourself'
			)
		}

		const otherUser = await this.prisma.user.findUnique({
			where: { id: otherUserId }
		})
		if (!otherUser) {
			throw new NotFoundException('User not found')
		}

		const existing = await this.prisma.conversation.findFirst({
			where: {
				type: ConversationType.DIRECT,
				AND: [
					{ members: { some: { userId: currentUserId } } },
					{ members: { some: { userId: otherUserId } } }
				]
			},
			include: { members: MEMBER_SELECT }
		})
		if (existing) return existing

		return this.prisma.conversation.create({
			data: {
				type: ConversationType.DIRECT,
				members: {
					create: [{ userId: currentUserId }, { userId: otherUserId }]
				}
			},
			include: { members: MEMBER_SELECT }
		})
	}

	async createGroup(creatorId: number, name: string, memberIds: number[]) {
		const uniqueMemberIds = Array.from(new Set([...memberIds, creatorId]))

		return this.prisma.conversation.create({
			data: {
				type: ConversationType.GROUP,
				name,
				creatorId,
				members: {
					create: uniqueMemberIds.map(userId => ({
						userId,
						role: userId === creatorId ? MemberRole.OWNER : MemberRole.MEMBER
					}))
				}
			},
			include: { members: MEMBER_SELECT }
		})
	}

	async addMember(
		conversationId: number,
		requesterId: number,
		newUserId: number
	) {
		const requester = await this.assertMember(conversationId, requesterId)
		const conversation = await this.prisma.conversation.findUnique({
			where: { id: conversationId }
		})
		if (!conversation) throw new NotFoundException('Conversation not found')
		if (conversation.type !== ConversationType.GROUP) {
			throw new ForbiddenException(
				'Can only add members to a group conversation'
			)
		}
		if (requester.role === MemberRole.MEMBER) {
			throw new ForbiddenException('Only owners or admins can add members')
		}

		return this.prisma.conversationMember.upsert({
			where: { conversationId_userId: { conversationId, userId: newUserId } },
			create: { conversationId, userId: newUserId },
			update: {}
		})
	}

	async removeMember(
		conversationId: number,
		requesterId: number,
		userId: number
	) {
		const requester = await this.assertMember(conversationId, requesterId)
		if (requester.role === MemberRole.MEMBER) {
			throw new ForbiddenException('Only owners or admins can remove members')
		}

		const conversation = await this.prisma.conversation.findUnique({
			where: { id: conversationId },
			include: { members: true }
		})
		if (!conversation) throw new NotFoundException('Conversation not found')
		if (conversation.type !== ConversationType.GROUP) {
			throw new ForbiddenException(
				'Can only remove members from a group conversation'
			)
		}

		const target = conversation.members.find(member => member.userId === userId)
		if (!target) throw new NotFoundException('Member not found')
		if (target.role === MemberRole.OWNER) {
			throw new ForbiddenException('The group owner cannot be removed')
		}
		if (
			requester.role === MemberRole.ADMIN &&
			target.role === MemberRole.ADMIN
		) {
			throw new ForbiddenException('Admins cannot remove other admins')
		}

		await this.prisma.conversationMember.delete({ where: { id: target.id } })
		return { conversationId, userId }
	}

	async listConversations(userId: number) {
		const conversations = await this.prisma.conversation.findMany({
			where: {
				members: { some: { userId } },
				OR: [
					{ type: ConversationType.GROUP },
					{ type: ConversationType.DIRECT, messages: { some: {} } }
				]
			},
			include: {
				members: MEMBER_SELECT,
				messages: { orderBy: { createdAt: 'desc' }, take: 1 }
			},
			orderBy: { updatedAt: 'desc' }
		})

		return conversations.map(c => ({
			id: c.id,
			type: c.type,
			name:
				c.type === ConversationType.GROUP
					? c.name
					: c.members.find(m => m.user.id !== userId)?.user.fullname,
			avatarUrl:
				c.type === ConversationType.GROUP
					? c.avatarUrl
					: c.members.find(m => m.user.id !== userId)?.user.avatarUrl,
			members: c.members,
			lastMessage: c.messages[0] ?? null,
			updatedAt: c.updatedAt
		}))
	}

	async getMessages(
		conversationId: number,
		userId: number,
		cursor?: number,
		limit = 30
	) {
		await this.assertMember(conversationId, userId)

		const messages = await this.prisma.message.findMany({
			where: { conversationId, ...(cursor ? { id: { lt: cursor } } : {}) },
			orderBy: { id: 'desc' },
			take: limit,
			include: {
				sender: {
					select: { id: true, username: true, fullname: true, avatarUrl: true }
				}
			}
		})

		return messages.reverse()
	}

	async sendMessage(conversationId: number, senderId: number, content: string) {
		await this.assertMember(conversationId, senderId)

		const message = await this.prisma.message.create({
			data: { conversationId, senderId, content },
			include: {
				sender: {
					select: { id: true, username: true, fullname: true, avatarUrl: true }
				}
			}
		})

		await this.prisma.conversation.update({
			where: { id: conversationId },
			data: { updatedAt: new Date() }
		})

		return message
	}

	async editMessage(messageId: number, userId: number, content: string) {
		const message = await this.prisma.message.findUnique({
			where: { id: messageId }
		})
		if (!message) throw new NotFoundException('Message not found')
		if (message.senderId !== userId) {
			throw new ForbiddenException('Only the sender can edit this message')
		}

		return this.prisma.message.update({
			where: { id: messageId },
			data: { content, editedAt: new Date() },
			include: {
				sender: {
					select: { id: true, username: true, fullname: true, avatarUrl: true }
				}
			}
		})
	}

	async deleteMessage(messageId: number, userId: number) {
		const message = await this.prisma.message.findUnique({
			where: { id: messageId }
		})
		if (!message) throw new NotFoundException('Message not found')
		if (message.senderId !== userId) {
			throw new ForbiddenException('Only the sender can delete this message')
		}

		await this.prisma.message.update({
			where: { id: messageId },
			data: { deletedAt: new Date() }
		})
		return { id: messageId, conversationId: message.conversationId }
	}

	async getUserConversationIds(userId: number): Promise<number[]> {
		const memberships = await this.prisma.conversationMember.findMany({
			where: { userId },
			select: { conversationId: true }
		})
		return memberships.map(m => m.conversationId)
	}

	async getConversationMemberIds(conversationId: number): Promise<number[]> {
		const members = await this.prisma.conversationMember.findMany({
			where: { conversationId },
			select: { userId: true }
		})
		return members.map(m => m.userId)
	}

	async setOnlineStatus(userId: number, isOnline: boolean) {
		return this.prisma.user.update({
			where: { id: userId },
			data: { isOnline, lastSeenAt: new Date() }
		})
	}
}
