"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const prisma_1 = require("../lib/prisma");
const axios_1 = __importDefault(require("axios"));
const dayjs_1 = __importDefault(require("dayjs"));
const zod_1 = require("zod");
const authenticate_1 = require("../plugins/authenticate");
const GenerateRefreshToken_1 = require("../provider/GenerateRefreshToken");
async function authRoutes(fastify) {
    fastify.get('/me', {
        onRequest: [authenticate_1.authenticate]
    }, async (request) => {
        return { user: request.user };
    });
    fastify.post('/users', async (request) => {
        const createUserBody = zod_1.z.object({
            access_token: zod_1.z.string()
        });
        const { access_token } = createUserBody.parse(request.body);
        const userResponse = await (0, axios_1.default)({
            method: 'get',
            url: 'https://www.googleapis.com/oauth2/v2/userinfo',
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });
        const userData = await userResponse.data;
        const userInfoSchema = zod_1.z.object({
            id: zod_1.z.string(),
            email: zod_1.z.string().email(),
            name: zod_1.z.string(),
            picture: zod_1.z.string().url()
        });
        const userInfo = userInfoSchema.parse(userData);
        let user = await prisma_1.prisma.user.findUnique({
            where: {
                googleId: userInfo.id
            }
        });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    googleId: userInfo.id,
                    nome: userInfo.name,
                    email: userInfo.email,
                    avatarUrl: userInfo.picture,
                }
            });
        }
        // Refresh token
        const token = fastify.jwt.sign({
            name: user.nome,
            avatarUrl: user.avatarUrl
        }, {
            sub: user.id,
            expiresIn: '20s'
        });
        await prisma_1.prisma.refreshToken.deleteMany({
            where: {
                userId: user.id
            }
        });
        const generateRefreshToken = new GenerateRefreshToken_1.GenerateRefreshToken();
        const refreshToken = await generateRefreshToken.execute(user.id);
        return { token, refreshToken };
    });
    fastify.post('/refreshToken', async (request, reply) => {
        const createUserBody = zod_1.z.object({
            refresh_token: zod_1.z.string()
        });
        const { refresh_token } = createUserBody.parse(request.body);
        const refreshToken = await prisma_1.prisma.refreshToken.findFirst({
            where: {
                id: refresh_token
            }
        });
        if (!refreshToken) {
            return reply.status(400).send({
                message: "Refresh token inválido"
            });
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                id: refreshToken.userId
            }
        });
        if (!user) {
            return reply.status(400).send({
                message: "Usuario inválido"
            });
        }
        const token = fastify.jwt.sign({
            name: user.nome,
            avatarUrl: user.avatarUrl
        }, {
            sub: user.id,
            expiresIn: '20s'
        });
        const refreshTokenExpired = (0, dayjs_1.default)().isAfter(dayjs_1.default.unix(refreshToken.expiresIn));
        if (refreshTokenExpired) {
            await prisma_1.prisma.refreshToken.deleteMany({
                where: {
                    userId: user.id
                }
            });
            const generateRefreshToken = new GenerateRefreshToken_1.GenerateRefreshToken();
            const newRefreshToken = await generateRefreshToken.execute(user.id);
            return { token, refreshToken: newRefreshToken };
        }
        return { token };
    });
}
exports.authRoutes = authRoutes;
