import { NotificationRepository } from "../repositories/notificationRepository.js";
import { AppError } from "../utils/appError.js";

const notificationRepository = new NotificationRepository();

export class NotificationService {
  async create(data) {
    return notificationRepository.create(data);
  }

  async list(userId, query = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = query;
    return notificationRepository.findByUser(userId, page, limit, unreadOnly);
  }

  async markAsRead(notificationId, userId) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) throw AppError.notFound("Notification not found");
    if (notification.userId !== userId) throw AppError.forbidden("Not your notification");

    await notificationRepository.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }

  async delete(notificationId, userId) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) throw AppError.notFound("Notification not found");
    if (notification.userId !== userId) throw AppError.forbidden("Not your notification");

    await notificationRepository.delete(notificationId, userId);
  }

  async getUnreadCount(userId) {
    return notificationRepository.getUnreadCount(userId);
  }
}
