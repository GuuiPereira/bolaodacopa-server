import { FastifyRequest } from "fastify";

export async function authenticate(request: FastifyRequest) {

  console.log({header: request.headers})

  await request.jwtVerify();

}