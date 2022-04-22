import { getModelForClass } from "@typegoose/typegoose";
import { User } from "../entitites/User";

export async function resolveUserReference(
	reference: Pick<User, "id">
): Promise<User | undefined | null> {
	return await getModelForClass(User).findOne({ _id: reference.id });
}
