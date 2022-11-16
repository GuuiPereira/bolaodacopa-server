import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";

import { poolRoutes } from "./routes/pool";
import { userRoutes } from "./routes/user";
import { guessRoutes } from "./routes/guess";
import { authRoutes } from "./routes/auth";
import { gameRoutes } from "./routes/game";
import { scoreRoutes } from "./routes/score";


async function bootstrap() {
  const fastify = Fastify({
    logger: true // monitoramento de logs
  });

  await fastify.register(cors, {
    origin: true
  })

  await fastify.register(jwt, {
    secret: 'nlw22'
  });

  await fastify.register(poolRoutes);
  await fastify.register(userRoutes);
  await fastify.register(guessRoutes);
  await fastify.register(authRoutes);
  await fastify.register(gameRoutes);
  await fastify.register(scoreRoutes);

  const host = '0.0.0.0';
  const port = +(process.env.PORT || 3333);

  await fastify.listen({
    port,
    host
  });
}

bootstrap();