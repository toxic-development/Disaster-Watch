export interface Update {
    title: string;
    timestamp: string | undefined;
    content?: string;
    fullContent?: string; // Modal content
    isFallbackData?: boolean; // Flag to identify fallback data
}
