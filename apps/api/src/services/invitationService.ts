import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendInvitation(email, phone) {
    if (email) {
        // Send email invitation logic
    }
    if (phone) {
        await client.messages.create({
            body: 'You are invited!',
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
    }
}
