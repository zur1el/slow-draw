import { customAlphabet } from "nanoid";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const createId = customAlphabet(alphabet, 21);
export const createInviteCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);