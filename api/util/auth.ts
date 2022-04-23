import { Request, Response } from "express";
import { verify, sign, SignOptions } from "jsonwebtoken";

export interface Context {
	req: Request;
	res: Response;
	user: Object | null;
}

export function signJwt(object: Object, options?: SignOptions | undefined) {
	return sign(object, process.env.SECRET || "JWT_SECRET", {
		...(options && options),
	});
}

export function verifyJwt<T>(token: string): T | null {
	try {
		const decoded = verify(token, process.env.SECRET || "JWT_SECRET") as T;
		return decoded;
	} catch (error) {
		console.log(error);
		return null;
	}
}

export function createContext(ctx: Context): Context {
	const context = ctx;

	if (context.req.cookies.accessToken) {
		const token = context.req.cookies.accessToken.split("Bearer ")[1];
		if (token) {
			context.user = verifyJwt(token);
		} else
			throw new Error(
				"Authentication header format must be: 'Bearer [token]'."
			);
	}

	return context;
}
