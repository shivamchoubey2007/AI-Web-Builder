require('dotenv').config();

async function checkKey() {
    const key = process.env.AI_API_KEY;
    if (!key) {
        console.error('❌ No AI_API_KEY found in .env');
        process.exit(1);
    }

    try {
        const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { Authorization: `Bearer ${key}` }
        });
        const data = await res.json();

        if (res.status !== 200 || !data?.data) {
            console.error('❌ Key is invalid or expired:', data?.error?.message || 'Unauthorized');
            return;
        }

        const d = data.data;
        const freeReq = d.free_model_daily_requests;

        console.log('\n================ OpenRouter Key Status ================');
        console.log(` Status:           ✅ Active & Valid`);
        console.log(` Expires At:       ${d.expires_at ? new Date(d.expires_at).toLocaleString() : 'Never'}`);
        console.log(` Account Tier:     ${d.is_free_tier ? 'Free Tier' : 'Paid Tier'}`);
        if (freeReq) {
            console.log(` Daily Free Quota: ${freeReq.remaining} requests left today (${freeReq.used}/${freeReq.limit} used)`);
        }
        console.log(` Key Spend Limit:  $${d.limit_remaining ?? 'Unlimited'}`);
        console.log('=======================================================\n');
    } catch (err) {
        console.error('❌ Network error checking key:', err.message);
    }
}

checkKey();
