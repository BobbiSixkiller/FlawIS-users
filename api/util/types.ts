import { ObjectId } from "mongodb";

export type Ref<T> = T | ObjectId;

export type User = {
	id: ObjectId;
	name: string;
	email: string;
	role: string;
	permissions: string[];
};

export type ResetToken = {
	id: string;
} | null;
