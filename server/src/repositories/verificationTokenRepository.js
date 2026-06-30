import { prisma } from "../lib/prisma.js";

export class VerificationTokenRepository {
  async create(data) {
    return prisma.verificationToken.create({ data });
  }

  async findByToken(token) {
    return prisma.verificationToken.findUnique({ where: { token } });
  }

  async update(token, data) {
    return prisma.verificationToken.update({ where: { token }, data });
  }
}
