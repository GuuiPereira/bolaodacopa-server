"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateRefreshToken = void 0;
const prisma_1 = require("../lib/prisma");
const dayjs_1 = __importDefault(require("dayjs"));
class GenerateRefreshToken {
    async execute(userId) {
        const expiresIn = (0, dayjs_1.default)().add(30, "days").unix();
        const generateRefreshToken = await prisma_1.prisma.refreshToken.create({
            data: {
                userId,
                expiresIn
            }
        });
        return generateRefreshToken;
    }
}
exports.GenerateRefreshToken = GenerateRefreshToken;
