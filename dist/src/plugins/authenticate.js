"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
async function authenticate(request) {
    console.log({ header: request.headers });
    await request.jwtVerify();
}
exports.authenticate = authenticate;
