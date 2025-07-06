exports.emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;

exports.isValidEmail = (email) => {
    const emailValidationRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailValidationRegex.test(email);
}

exports.isContactFormPage = (url, html) => {
    const urlLower = url.toLowerCase();
    const htmlLower = html.toLowerCase();
    
    const contactPatterns = [
        /(?:^|[-_/])contact(?:[-_/]|$)/i,
        /(?:^|[-_/])get-in-touch(?:[-_/]|$)/i,
        /(?:^|[-_/])reach-us(?:[-_/]|$)/i,
        /(?:^|[-_/])write-to-us(?:[-_/]|$)/i,
        /(?:^|[-_/])send-message(?:[-_/]|$)/i,
        /(?:^|[-_/])contact-us(?:[-_/]|$)/i,
        /(?:^|[-_/])get-quote(?:[-_/]|$)/i,
        /(?:^|[-_/])request-quote(?:[-_/]|$)/i,
        /(?:^|[-_/])inquiry(?:[-_/]|$)/i,
        /(?:^|[-_/])enquiry(?:[-_/]|$)/i,
        /(?:^|[-_/])support(?:[-_/]|$)/i,
        /(?:^|[-_/])help(?:[-_/]|$)/i,
        /(?:^|[-_/])feedback(?:[-_/]|$)/i
    ];

    for (const pattern of contactPatterns) {
        if (pattern.test(urlLower)) {
            return true;
        }
    }

    const contactFormIndicators = [
        'contact form',
        'get in touch',
        'send us a message',
        'write to us',
        'contact us',
        'get quote',
        'request quote',
        'inquiry form',
        'enquiry form',
        'support form',
        'feedback form',
        'name"',
        'email"',
        'message"',
        'subject"',
        'phone"',
        'tel"'
    ];

    for (const indicator of contactFormIndicators) {
        if (htmlLower.includes(indicator)) {
            return true;
        }
    }

    return false;
};