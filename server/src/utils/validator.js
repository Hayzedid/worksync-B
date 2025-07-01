import { genSalt, hash, compare } from 'bcrypt';
const SALT_ROUNDS = 10;

async function hashPassword(password) {
    try{
        const salt = await genSalt(SALT_ROUNDS);
        const hashedPassword = await hash(password, salt)
        return hashedPassword;
    } catch (error) {
        throw new Error('Error hashing password');
    }
}




async function verifyPassword(password, hashedPassword) {
    try {
        const isMatch = await compare(password, hashedPassword);
        return isMatch;
    } catch (error) {
        throw new Error('Error verifying password');
    }
}


export { hashPassword, verifyPassword };