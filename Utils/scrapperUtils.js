const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;

function isValidEmail(email) {
    const emailValidationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailValidationRegex.test(email);
}

module.exports = {
    emailRegex,
    isValidEmail
};