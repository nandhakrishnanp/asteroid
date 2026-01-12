import ollama from 'ollama'

async function embedTexts(texts) {
    const batch = await ollama.embed({
        model: 'embeddinggemma:300m-qat-q4_0',
        input: texts,
    })
    return batch.embeddings
}

export { embedTexts }