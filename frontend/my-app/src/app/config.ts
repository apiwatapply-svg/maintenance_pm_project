// const isProd = process.env.NODE_ENV === 'production';

// Dynamic API URL detection
// Dynamic API URL detection
const getApiServer = () => {
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        return `${protocol}//${hostname}:5006`;
    }
    // Default fallback
    return "http://localhost:5006";
};

export default {
    apiServer: process.env.NEXT_PUBLIC_API_URL || getApiServer(),
    token: "asdfghjklghjklkjhgf",
};
