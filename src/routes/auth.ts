import { FastifyInstance } from "fastify"
import { prisma } from "../lib/prisma"
import axios from 'axios';
import dayjs from "dayjs";
import { z } from 'zod';
import { authenticate } from "../plugins/authenticate";
import { GenerateRefreshToken } from "../provider/GenerateRefreshToken";

export async function authRoutes(fastify: FastifyInstance) {

  fastify.get('/me', {
    onRequest: [authenticate]
  },
    async (request) => {
      return { user: request.user }
    })

  fastify.post('/users', async (request) => {

    const createUserBody = z.object({
      access_token: z.string()
    });

    const { access_token } = createUserBody.parse(request.body);

    const userResponse = await axios({
      method: 'get',
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    })

    const userData = await userResponse.data;

    const userInfoSchema = z.object({
      id: z.string(),
      email: z.string().email(),
      name: z.string(),
      picture: z.string().url()
    })

    const userInfo = userInfoSchema.parse(userData);

    let user = await prisma.user.findUnique({
      where: {
        googleId: userInfo.id
      }
    })

    if (!user) {

      user = await prisma.user.create({
        data: {
          googleId: userInfo.id,
          nome: userInfo.name,
          email: userInfo.email,
          avatarUrl: userInfo.picture,
        }
      })
    }

    // Refresh token

    const token = fastify.jwt.sign({
      name: user.nome,
      avatarUrl: user.avatarUrl
    }, {
      sub: user.id,
      expiresIn: '20s'
    })

    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id
      }
    });

    const generateRefreshToken = new GenerateRefreshToken();
    const refreshToken = await generateRefreshToken.execute(user.id)
    return { token, refreshToken }

  })


  fastify.post('/refreshToken', async (request, reply) => {

    const createUserBody = z.object({
      refresh_token: z.string()
    });

    const { refresh_token } = createUserBody.parse(request.body);

    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        id: refresh_token
      }
    });

    if (!refreshToken) {
      return reply.status(400).send({
        message: "Refresh token inválido"
      })
    }

    const user = await prisma.user.findFirst({
      where: {
        id: refreshToken.userId
      }
    });

    if (!user) {
      return reply.status(400).send({
        message: "Usuario inválido"
      })
    }
    const token = fastify.jwt.sign({
      name: user.nome,
      avatarUrl: user.avatarUrl
    }, {
      sub: user.id,
      expiresIn: '20s'
    })


    const refreshTokenExpired = dayjs().isAfter(dayjs.unix(refreshToken.expiresIn))
    if (refreshTokenExpired) {

      await prisma.refreshToken.deleteMany({
        where: {
          userId: user.id
        }
      });

      const generateRefreshToken = new GenerateRefreshToken();
      const newRefreshToken = await generateRefreshToken.execute(user.id);
      return { token, refreshToken: newRefreshToken }

    }

    return { token }

  })


}

