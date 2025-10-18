
export interface VLSTopic {
    title: string;
    subtopics: string[];
}

export interface VLSClient {
    client_type: string;
    metadata: {
        priority: string;
        sector: string;
        description: string;
    };
    instruction: {
        system_prompt: string;
        context: string;
        tone: string;
        difficulty_levels: string[];
    };
    topics: {
        hardcoded: VLSTopic[];
        custom: {
            title: string;
            description: string;
        }[];
    };
    question_generation: {
        style: string[];
        output_format: string;
        examples: {
            question: string;
            type: string;
            options: string[];
            answer: string;
            explanation: string;
        }[];
    };
}
