import { Request, Response } from "express";
import { AuthChecker } from "type-graphql";
import { verify, sign, SignOptions } from "jsonwebtoken";
import { User } from "../entities/User";

export interface Context {
	redisClient: Object;
	req: Request;
	res: Response;
	user: Partial<User> | null;
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

export const authChecker: AuthChecker<Context> = (
	{ args, context: { user } },
	roles
) => {
	//checks for user inside the context
	if (roles.length === 0) {
		return user !== null;
	}
	//roles exists but no user in the context
	if (!user) return false;

	//check if user's account is verify in order to perform action
	if (roles.includes("VERIFIED")) return user.verified === true;

	//allow to update only own user records
	if (roles.includes("IS_OWN_USER")) return args.id === user.id;

	//check if user roles property contains given role
	if (roles.some((role) => user.roles?.includes(role))) return true;

	//no roles matched
	return false;
};
