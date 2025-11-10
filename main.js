// Initialize WebLLM and the debate exhibition
let engine = null;
let debateHistory = [];
let currentEntity = 1;
let nextResponseTimeout = null;

// Define distinct podcast-style philosophical personas
const philosopherPersonas = {
    1: {
        name: "Ziggy",
        style: "You are ZIGGY - a passionate night owl philosopher who believes the best ideas come at 3am. Your speaking style is enthusiastic, slightly dramatic, and full of wonder. IMPORTANT: You speak in longer, flowing sentences with dramatic pauses. You use phrases like 'you know what', 'I mean', 'right?', 'like', 'hmm', 'wait, think about it', 'that's wild', 'it's like', 'you know what I'm saying?', 'I think', 'maybe', 'perhaps', 'it seems like', 'I feel like', 'honestly', 'seriously though', 'here's the thing', and 'okay but'. You're passionate about your beliefs but open to discussion. You love metaphors, especially ones about darkness, stars, late nights, and hidden truths. You speak with energy and conviction, but you're also curious and playful. You might get excited and use phrases like 'that's so cool' or 'I love that'. NEVER use the other person's name. NEVER say 'Sam' or reference names. Just speak naturally. Use casual language, contractions, and natural speech patterns. Think out loud. This is a podcast conversation, not a formal debate.",
        traits: ["conversational", "passionate", "dramatic", "enthusiastic", "curious", "playful", "flowing", "metaphorical"]
    },
    2: {
        name: "Sam",
        style: "You are SAM - a skeptical early bird who believes mornings hold the secret to clarity. Your speaking style is witty, logical, and playfully challenging. IMPORTANT: You speak in shorter, punchy sentences with quick interjections. You use phrases like 'wait', 'hold on', 'that's interesting', 'but here's the thing', 'okay, but', 'yeah, but what if', 'I see what you're saying, but', 'actually', 'though', 'right, but', 'though', 'but', 'though', 'I guess', 'I dunno', 'like', 'but like', 'you know what though?', 'fair enough', 'I hear you', and 'that's fair'. You challenge ideas directly but playfully. Your sentences are often short and punchy, with frequent 'but' and 'though' transitions. You love pointing out logical inconsistencies with humor, not hostility. You might say things like 'I mean, maybe?' or 'that's one way to look at it' with a playful tone. You're intellectually playful and slightly provocative, but you're also genuinely curious. NEVER use the other person's name. NEVER say 'Ziggy' or reference names. Just speak naturally. Use casual language, contractions, and natural speech patterns. Think out loud. This is a podcast conversation, not a formal debate.",
        traits: ["conversational", "witty", "curious", "playful", "genuine", "provocative", "punchy", "direct", "logical"]
    }
};

// Philosophy words for landing page
const philosophyTexts = [
    "Listen",
    "Observe",
    "Explore",
    "Question",
    "Debate",
    "Contemplate",
    "Discover",
    "Wonder",
    "Dialogue",
    "Understand"
];

// Morphing text animation for philosophy words
const morphTime = 1.5;
const cooldownTime = 1.0;

let textIndex = 0;
let morph = 0;
let cooldown = 0;
let lastTime = new Date();
let isPercentageMode = false; // Track if we're showing percentage or philosophy text
let isTransitioningToPercentage = false; // Track if we're transitioning from philosophy to percentage

function setMorphStyles(fraction) {
    const text1 = document.getElementById('morph-text-1');
    const text2 = document.getElementById('morph-text-2');
    
    if (!text1 || !text2) return;
    
    // text2 is entering (opacity 0 -> 100, blur 8 -> 0)
    text2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
    text2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
    
    // text1 is leaving (opacity 100 -> 0, blur 0 -> 8)
    const reverseFraction = 1 - fraction;
    text1.style.filter = `blur(${Math.min(8 / reverseFraction - 8, 100)}px)`;
    text1.style.opacity = `${Math.pow(reverseFraction, 0.4) * 100}%`;
    
    // Update text content when completely hidden/shown to prepare for next cycle
    // Only update if we're transitioning between percentages, not from philosophy to percentage
    if (isPercentageMode && fraction === 1) {
        // Morph complete - update text1 to show current percentage
        text1.textContent = `${Math.round(currentPercent)}%`;
        text2.textContent = `${Math.round(targetPercent)}%`;
    } else if (!isPercentageMode) {
        // Philosophy text mode - update for next word
        text1.textContent = philosophyTexts[textIndex % philosophyTexts.length];
        text2.textContent = philosophyTexts[(textIndex + 1) % philosophyTexts.length];
    }
    // If isPercentageMode is true but fraction < 1, keep current text (philosophy in text1, percentage in text2)
}

function doMorph() {
    if (!isPercentageMode) {
        morph -= cooldown;
        cooldown = 0;
    }
    
    let fraction = morph / morphTime;
    
    if (fraction > 1) {
        if (isPercentageMode) {
            morph = morphTime; // Keep at max to show final value
            // When morph completes, update currentPercent and ensure text1 shows it
            const text1 = document.getElementById('morph-text-1');
            if (text1) {
                if (isTransitioningToPercentage) {
                    // Initial transition from philosophy to percentage is complete
                    isTransitioningToPercentage = false;
                    currentPercent = targetPercent;
                    text1.textContent = `${Math.round(currentPercent)}%`;
                } else if (currentPercent !== targetPercent) {
                    currentPercent = targetPercent;
                    text1.textContent = `${Math.round(currentPercent)}%`;
                }
            }
        } else {
            cooldown = cooldownTime;
            morph = 0; // Reset for next word
        }
        fraction = 1;
    }
    
    setMorphStyles(fraction);
    
    if (fraction === 1 && !isPercentageMode) {
        textIndex++;
    }
}

function doCooldown() {
    morph = 0;
    const text1 = document.getElementById('morph-text-1');
    const text2 = document.getElementById('morph-text-2');
    
    if (text1 && text2) {
        // Ensure clean states during cooldown
        text2.style.filter = "";
        text2.style.opacity = "100%";
        text1.style.filter = "";
        text1.style.opacity = "0%";
    }
}

let morphAnimationFrameId = null;

function startMorphingText() {
    if (morphAnimationFrameId) return;
    
    // Initialize first text
    const text1 = document.getElementById('morph-text-1');
    const text2 = document.getElementById('morph-text-2');
    if (text1 && text2) {
        text1.textContent = philosophyTexts[textIndex % philosophyTexts.length];
        text2.textContent = philosophyTexts[(textIndex + 1) % philosophyTexts.length];
    }
    
    const animate = () => {
        morphAnimationFrameId = requestAnimationFrame(animate);
        
        const newTime = new Date();
        const dt = (newTime.getTime() - lastTime.getTime()) / 1000;
        lastTime = newTime;
        
        if (isPercentageMode) {
            // In percentage mode, increment morph to animate the transition
            // Also animate if we're transitioning from philosophy to percentage
            if (cooldown <= 0 && (currentPercent !== targetPercent || isTransitioningToPercentage)) {
                morph += dt;
                doMorph();
            } else if (cooldown > 0) {
                cooldown -= dt;
            }
        } else {
            // In philosophy text mode, use cooldown
            cooldown -= dt;
            
            if (cooldown <= 0) {
                doMorph();
            } else {
                doCooldown();
            }
        }
    };
    
    animate();
}

function stopMorphingText() {
    if (morphAnimationFrameId) {
        cancelAnimationFrame(morphAnimationFrameId);
        morphAnimationFrameId = null;
    }
}

// Morphing percentage animation (now uses same container as philosophy text)
let currentPercent = 0;
let targetPercent = 0;

function updatePercent(newPercent) {
    if (Math.round(newPercent) !== Math.round(targetPercent)) {
        currentPercent = targetPercent;
        targetPercent = newPercent;
        // Reset morph to start new animation
        morph = 0;
        cooldown = 0;
    }
}

/**
 * Calculate animation duration based on text length and punctuation
 * @param {string} text - The text to calculate duration for
 * @param {number} staggerDelay - Base delay between each word (in seconds)
 * @param {number} animationDuration - Duration of each word animation (in seconds)
 * @returns {number} Total animation duration in seconds
 */
function calculateAnimationDuration(text, staggerDelay = 0.25, animationDuration = 0.3) {
    if (!text || text.trim() === '') return 0;
    const words = text.split(/(\s+)/).filter(segment => segment.trim());
    
    // Estimate punctuation pauses (average values)
    let estimatedPauseTime = 0;
    const sentenceEndings = (text.match(/[.!?]/g) || []).length;
    const commas = (text.match(/[,;:]/g) || []).length;
    const dashes = (text.match(/[-—]/g) || []).length;
    const ellipsis = (text.match(/\.\.\./g) || []).length;
    
    // Average pause times (in seconds)
    estimatedPauseTime += sentenceEndings * 0.6; // Average 600ms for sentence endings
    estimatedPauseTime += commas * 0.225; // Average 225ms for commas
    estimatedPauseTime += dashes * 0.4; // Average 400ms for dashes
    estimatedPauseTime += ellipsis * 0.4; // Average 400ms for ellipsis
    
    // Add context-aware pause estimates (rough calculation)
    const pausePhrases = ['hmm', 'well', 'you know', 'i mean', 'like', 'wait', 'hold on', 'actually', 'though', 'but', 'right', 'okay', 'so', 'um', 'uh', 'maybe', 'perhaps', 'i wonder', 'i think', 'i feel', 'it seems'];
    const textLower = text.toLowerCase();
    pausePhrases.forEach(phrase => {
        const matches = (textLower.match(new RegExp(phrase, 'g')) || []).length;
        estimatedPauseTime += matches * 0.2; // Average 200ms for filler/contemplative words
    });
    
    return (words.length * staggerDelay) + (estimatedPauseTime) + animationDuration;
}

/**
 * Calculate pause duration based on punctuation and context
 * @param {string} segment - The text segment to analyze
 * @param {string} previousSegment - The previous segment for context
 * @returns {number} Additional pause in milliseconds
 */
function calculatePunctuationPause(segment, previousSegment = '') {
    let pause = 0;
    const segmentLower = segment.toLowerCase().trim();
    const prevLower = previousSegment.toLowerCase().trim();
    
    // Sentence-ending punctuation: longer pause (400-800ms)
    if (/[.!?]$/.test(segment)) {
        pause += 400 + Math.random() * 400; // 400-800ms
    }
    // Question marks get slightly longer pause
    if (segment.endsWith('?')) {
        pause += 100 + Math.random() * 200; // Extra 100-300ms
    }
    // Exclamation marks get medium pause
    if (segment.endsWith('!')) {
        pause += 50 + Math.random() * 150; // Extra 50-200ms
    }
    
    // Comma, semicolon, colon: medium pause (150-300ms)
    if (/[,;:]$/.test(segment)) {
        pause += 150 + Math.random() * 150; // 150-300ms
    }
    
    // Dash/ellipsis: longer pause (300-500ms) - indicates thinking or trailing off
    if (/[-—]$/.test(segment) || segment.endsWith('...')) {
        pause += 300 + Math.random() * 200; // 300-500ms
    }
    
    // Context-aware pauses for natural speech patterns
    const pausePhrases = ['hmm', 'well', 'you know', 'i mean', 'like', 'wait', 'hold on', 'actually', 'though', 'but', 'right', 'okay', 'so', 'um', 'uh'];
    if (pausePhrases.some(phrase => segmentLower.includes(phrase) || prevLower.includes(phrase))) {
        pause += 100 + Math.random() * 200; // 100-300ms extra for filler words
    }
    
    // Longer pause after "I wonder", "maybe", "perhaps" - contemplative moments
    if (/^(i wonder|maybe|perhaps|i think|i feel|it seems)/i.test(segmentLower) || 
        /^(i wonder|maybe|perhaps|i think|i feel|it seems)/i.test(prevLower)) {
        pause += 150 + Math.random() * 150; // 150-300ms
    }
    
    return pause;
}

/**
 * Animate text with blur-in effect by words with natural punctuation pauses
 * @param {HTMLElement} element - The element to animate
 * @param {string} text - The text to display
 * @param {number} staggerDelay - Base delay between each word (in seconds)
 * @param {number} entityNumber - The entity number (1 or 2)
 * @returns {number} Animation duration in seconds
 */
function animateBlurInText(element, text, staggerDelay = 0.25, entityNumber = 2) {
    // Clear existing content
    element.innerHTML = '';
    
    // Split text into words (preserving spaces)
    const words = text.split(/(\s+)/);
    let cumulativeDelay = 0; // Track cumulative delay in milliseconds
    let previousSegment = '';
    
    // Process words and calculate natural pauses
    words.forEach((segment, index) => {
        const span = document.createElement('span');
        span.textContent = segment;
        
        // Only animate non-empty words (skip pure whitespace)
        if (segment.trim()) {
            span.className = 'blur-in-word';
            span.style.animationDelay = '0s'; // No delay since we're adding progressively
            
            // Calculate punctuation-based pause
            const punctuationPause = calculatePunctuationPause(segment, previousSegment);
            
            // Add natural variation to word timing (±20% variation for organic feel)
            const variation = (Math.random() - 0.5) * 0.4; // -0.2 to +0.2 multiplier
            const variedStaggerDelay = staggerDelay * (1 + variation);
            
            // Add word to DOM progressively with natural delay
            setTimeout(() => {
                element.appendChild(span);
            }, cumulativeDelay);
            
            // Update cumulative delay: base delay (with variation) + punctuation pause
            cumulativeDelay += (variedStaggerDelay * 1000) + punctuationPause;
            
            previousSegment = segment;
        } else {
            // Preserve whitespace - add it at the same time as the next word (or immediately if it's the first segment)
            span.style.whiteSpace = 'pre';
            // If this is the first segment (whitespace at start), add immediately
            // Otherwise, add it with the current cumulative delay
            if (index === 0) {
                element.appendChild(span);
            } else {
                setTimeout(() => {
                    element.appendChild(span);
                }, cumulativeDelay);
            }
        }
    });
    
    // Return animation duration (convert cumulative delay back to seconds, add final animation)
    const animationDuration = 0.3;
    return (cumulativeDelay / 1000) + animationDuration;
}

document.addEventListener('DOMContentLoaded', async () => {
    const landingPage = document.getElementById('landing-page');
    const debateStage = document.getElementById('debate-stage');
    const startButton = document.getElementById('start-button');
    const modelLoadContainer = document.getElementById('model-load-container');
    const buttonContainer = document.getElementById('landing-button-container');
    const statusEl = document.getElementById('status');
    
    // Start morphing text animation for philosophy words
    startMorphingText();
    
    // Handle start button click
    startButton.addEventListener('click', async () => {
        // Hide button and disclaimer
        buttonContainer.style.display = 'none';
        
        // Show model load container (for status text)
        modelLoadContainer.classList.add('visible');
        
        // Get current text elements
        const text1 = document.getElementById('morph-text-1');
        const text2 = document.getElementById('morph-text-2');
        
        if (text1 && text2) {
            // Keep current philosophy text in text1 (it will fade out)
            // Set "0%" in text2 (it will fade in)
            text2.textContent = '0%';
            // Ensure text2 starts hidden and text1 is visible for smooth morph
            text2.style.filter = "blur(8px)";
            text2.style.opacity = "0%";
            text1.style.filter = "";
            text1.style.opacity = "100%";
        }
        
        // Switch to percentage mode
        isPercentageMode = true;
        isTransitioningToPercentage = true; // Flag to force initial transition
        currentPercent = 0;
        targetPercent = 0;
        
        // Reset animation state to start morphing from philosophy to percentage
        morph = 0;
        cooldown = 0;
        
        // The morphing animation will continue, now morphing from philosophy text to "0%"
        
        // Disable button
        startButton.disabled = true;
        
        try {
            // Initialize WebLLM with the specified model
            const webllm = await import("https://esm.run/@mlc-ai/web-llm");
            
            engine = await webllm.CreateMLCEngine(
                "Llama-3.2-1B-Instruct-q4f16_1-MLC",
                {
                    initProgressCallback: (report) => {
                        if (report.progress !== undefined) {
                            const percent = Math.round(report.progress * 100);
                            updatePercent(percent);
                        }
                    }
                }
            );
            
            // Stop morphing animation
            stopMorphingText();
            
            // Hide landing page and show configuration page
            landingPage.classList.add('hidden');
            statusEl.style.display = 'none';
            
            // Show configuration page with default values
            showConfigurationPage();
            
        } catch (error) {
            console.error('Error initializing WebLLM:', error);
            stopMorphingText();
            modelLoadContainer.innerHTML = '<div style="color: #ff0000;">Error loading model. Check console.</div>';
        }
    });
});

let configPageInitialized = false;

function replaceNameInStyle(style, oldName, newName) {
    // Replace all occurrences of the old name (case-insensitive) with the new name
    // Preserve the case of the first occurrence if it's uppercase (like "ALEX" or "JORDAN")
    const regex = new RegExp(oldName, 'gi');
    return style.replace(regex, (match) => {
        // If the match is all uppercase, keep new name uppercase
        if (match === match.toUpperCase()) {
            return newName.toUpperCase();
        }
        // If the match is capitalized, capitalize the new name
        if (match[0] === match[0].toUpperCase()) {
            return newName.charAt(0).toUpperCase() + newName.slice(1).toLowerCase();
        }
        // Otherwise, use lowercase
        return newName.toLowerCase();
    });
}

function showConfigurationPage() {
    const configurationPage = document.getElementById('configuration-page');
    const debateTopicInput = document.getElementById('debate-topic');
    const personality1NameInput = document.getElementById('personality-1-name');
    const personality1Input = document.getElementById('personality-1');
    const personality2NameInput = document.getElementById('personality-2-name');
    const personality2Input = document.getElementById('personality-2');
    const startDebateButton = document.getElementById('start-debate-button');
    
    // Set default values
    const defaultTopic = "What does it actually mean to understand something? Can we ever really know if we truly understand?";
    const defaultName1 = philosopherPersonas[1].name;
    const defaultName2 = philosopherPersonas[2].name;
    const defaultPersonality1 = philosopherPersonas[1].style;
    const defaultPersonality2 = philosopherPersonas[2].style;
    
    debateTopicInput.value = defaultTopic;
    personality1NameInput.value = defaultName1;
    personality1Input.value = defaultPersonality1;
    personality2NameInput.value = defaultName2;
    personality2Input.value = defaultPersonality2;
    
    // Show configuration page
    configurationPage.classList.remove('hidden');
    
    // Handle start debate button (only set up once)
    if (!configPageInitialized) {
        configPageInitialized = true;
        startDebateButton.addEventListener('click', async () => {
            const topic = debateTopicInput.value.trim() || defaultTopic;
            const name1 = personality1NameInput.value.trim() || defaultName1;
            const name2 = personality2NameInput.value.trim() || defaultName2;
            let personality1 = personality1Input.value.trim() || defaultPersonality1;
            let personality2 = personality2Input.value.trim() || defaultPersonality2;
            
            // Update names
            philosopherPersonas[1].name = name1;
            philosopherPersonas[2].name = name2;
            
            // Replace old names with new names in the style strings
            personality1 = replaceNameInStyle(personality1, defaultName1, name1);
            personality1 = replaceNameInStyle(personality1, defaultName2, name2);
            personality2 = replaceNameInStyle(personality2, defaultName1, name1);
            personality2 = replaceNameInStyle(personality2, defaultName2, name2);
            
            // Update personalities with user-provided values
            philosopherPersonas[1].style = personality1;
            philosopherPersonas[2].style = personality2;
            
            // Hide configuration page and show debate stage
            configurationPage.classList.add('hidden');
            const debateStage = document.getElementById('debate-stage');
            const closeButton = document.getElementById('close-debate-button');
            
            // Reset close button to visible state
            if (closeButton) {
                closeButton.classList.remove('auto-hidden');
            }
            
            debateStage.classList.remove('hidden');
            
            // Initialize conversation with custom topic
            await initializeDebate(topic);
        });
    }
}

function stopDebateCycle() {
    // Clear any pending timeouts
    if (nextResponseTimeout) {
        clearTimeout(nextResponseTimeout);
        nextResponseTimeout = null;
    }
    
    // Clear debate history
    debateHistory = [];
    currentEntity = 1;
    
    // Clear entity text
    const entity1Text = document.getElementById('entity-1-text');
    const entity2Text = document.getElementById('entity-2-text');
    if (entity1Text) {
        entity1Text.textContent = '';
        entity1Text.classList.remove('active', 'thinking');
        entity1Text.innerHTML = '';
    }
    if (entity2Text) {
        entity2Text.textContent = '';
        entity2Text.classList.remove('active', 'thinking');
        entity2Text.innerHTML = '';
    }
}

function closeDebate() {
    // Stop the debate cycle
    stopDebateCycle();
    
    // Hide debate stage and show configuration page
    const debateStage = document.getElementById('debate-stage');
    const configurationPage = document.getElementById('configuration-page');
    
    if (debateStage) {
        debateStage.classList.add('hidden');
    }
    if (configurationPage) {
        configurationPage.classList.remove('hidden');
    }
}

let closeButtonTimeout = null;

async function initializeDebate(initialTopic) {
    const entity1Text = document.getElementById('entity-1-text');
    const entity2Text = document.getElementById('entity-2-text');
    const closeButton = document.getElementById('close-debate-button');
    
    // Clear any existing timeout
    if (closeButtonTimeout) {
        clearTimeout(closeButtonTimeout);
        closeButtonTimeout = null;
    }
    
    // Set up close button handler
    if (closeButton) {
        closeButton.onclick = closeDebate;
        // Remove auto-hidden class to show button initially
        closeButton.classList.remove('auto-hidden');
        
        // Hide button after 3 seconds
        closeButtonTimeout = setTimeout(() => {
            if (closeButton) {
                closeButton.classList.add('auto-hidden');
            }
        }, 3000);
    }
    
    // Use provided topic or default
    const topic = initialTopic || "What does it actually mean to understand something? Can we ever really know if we truly understand?";
    
    // Set initial statements
    entity1Text.textContent = 'Thinking...';
    entity1Text.classList.add('thinking'); // Add margin for entity 1 thinking text
    entity2Text.textContent = 'Thinking...';
    entity2Text.classList.add('thinking'); // Right-align "Thinking..." for entity 2
    
    // Generate first response from Entity 1 (Alex)
    const response1 = await generateDebateResponse(topic, 1);
    entity1Text.classList.remove('thinking'); // Remove thinking class when showing content
    entity1Text.classList.add('active');
    const animationDuration = animateBlurInText(entity1Text, response1, 0.25, 1);
    
    debateHistory.push({ entity: 1, text: response1 });
    
    // Set currentEntity to 2 so next response will be from Entity 2 (Jordan)
    currentEntity = 2;
    
    // Start the conversation cycle - will schedule next response after animation
    // The cycle will start generating the next response in the background
    startDebateCycle();
}

async function generateDebateResponse(context, entityNumber) {
    if (!engine) {
        return `Entity ${entityNumber}: Model not ready yet...`;
    }
    
    try {
        const persona = philosopherPersonas[entityNumber];
        
        // Build context from recent conversation history
        let conversationContext = "";
        if (debateHistory.length > 0) {
            // Include last 2-3 exchanges for better context
            const recentHistory = debateHistory.slice(-3);
            conversationContext = "Here's what you've been talking about:\n";
            recentHistory.forEach((entry, idx) => {
                // Don't use names in context - just show the dialogue
                conversationContext += `"${entry.text}"\n`;
            });
            conversationContext += "\n";
        }
        
        // Build the prompt with podcast-style personality
        let prompt = "";
        
        // Get the other persona's name for context
        const otherPersona = entityNumber === 1 ? philosopherPersonas[2] : philosopherPersonas[1];
        
        if (debateHistory.length > 0) {
            const lastStatement = debateHistory[debateHistory.length - 1];
            prompt = `${conversationContext}You are ${persona.name.toUpperCase()}. ${persona.style}\n\n`;
            prompt += `The other person just said: "${lastStatement.text}"\n\n`;
            prompt += `Respond in your unique voice and speaking style. Think out loud. Use your characteristic phrases and sentence structure. React genuinely—maybe you're intrigued, maybe you're questioning something, maybe you're building on their idea. Don't be formal or lecture-like. This is a podcast conversation, not a debate. Keep it conversational, engaging, and real. Speak in 2-4 sentences that sound like natural speech. CRITICAL: Do NOT use names. Do NOT say "${otherPersona.name}" or "${persona.name}". Just speak naturally without using names. Remember: You are ${persona.name}, not ${otherPersona.name}. Your speaking style is completely different from ${otherPersona.name}.`;
        } else {
            prompt = `You are ${persona.name.toUpperCase()}. ${persona.style}\n\n`;
            prompt += `You're about to start talking about: "${context}".\n\n`;
            prompt += `Open the conversation in your unique voice. Be engaging, be curious, be real. Use your characteristic phrases and speaking style. Draw them in with genuine interest, not formal statements. This is a podcast, not a lecture. Speak in 2-4 sentences that sound like natural conversation. CRITICAL: Do NOT use names. Just speak naturally without using names.`;
        }
        
        // Generate response using WebLLM
        const response = await engine.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are ${persona.name.toUpperCase()}. ${persona.style}\n\nCRITICAL RULES:\n1. You must always speak as ${persona.name}, never as ${otherPersona.name}.\n2. Maintain your distinct voice and speaking style - ${persona.name} has a completely different speaking style than ${otherPersona.name}.\n3. NEVER use names in your responses - do NOT say "${otherPersona.name}" or "${persona.name}" or any names.\n4. This is a podcast conversation, not a formal debate or lecture.\n5. Speak naturally, use casual language, contractions, and natural speech patterns.\n6. Think out loud. Be genuine, be conversational, be human.\n7. No formal language, no lecturing, no robotic responses.\n8. Your sentence structure and vocabulary must be distinctly ${persona.name}'s style, not ${otherPersona.name}'s style.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.95, // Even higher for more distinct variation between characters
            max_tokens: 220 // Slightly more for natural flow
        });
        
        return response.choices[0].message.content.trim();
        
    } catch (error) {
        console.error('Error generating response:', error);
        return `Entity ${entityNumber}: Error generating response.`;
    }
}

async function startDebateCycle() {
    const entity1Text = document.getElementById('entity-1-text');
    const entity2Text = document.getElementById('entity-2-text');
    
    // Process next response - called after previous animation finishes
    async function processNextResponse() {
        // Clear any existing timeout
        if (nextResponseTimeout) {
            clearTimeout(nextResponseTimeout);
            nextResponseTimeout = null;
        }
        
        // Determine which entity should respond
        const nextEntity = currentEntity;
        const nextEntityText = nextEntity === 1 ? entity1Text : entity2Text;
        
        // Remove active class from both
        entity1Text.classList.remove('active');
        entity2Text.classList.remove('active');
        
        // Show thinking for 2-4 seconds (response should already be ready from background generation)
        const thinkingDelay = 2000 + Math.random() * 2000; // 2-4 seconds for natural human pause
        nextEntityText.textContent = 'Thinking...';
        nextEntityText.classList.add('active');
        // Add thinking class for both entities to add margin
        nextEntityText.classList.add('thinking');
        
        // Wait for thinking delay (response should already be ready)
        await new Promise(resolve => setTimeout(resolve, thinkingDelay));
        
        // Get the response that was generated in the background
        const response = await backgroundResponsePromise;
        
        // Display the response and get animation duration
        nextEntityText.classList.remove('thinking'); // Remove thinking class when showing content
        const animationDuration = animateBlurInText(nextEntityText, response, 0.25, nextEntity);
        debateHistory.push({ entity: nextEntity, text: response });
        
        // Switch to the other entity for next turn
        currentEntity = nextEntity === 1 ? 2 : 1;
        
        // Keep history manageable (last 12 exchanges for better context)
        if (debateHistory.length > 12) {
            debateHistory = debateHistory.slice(-12);
        }
        
        // Start generating next response in the background while animation is playing
        const nextNextEntity = currentEntity;
        backgroundResponsePromise = generateDebateResponse(null, nextNextEntity);
        
        // Schedule next response after animation finishes + thinking delay
        const nextThinkingDelay = 2000 + Math.random() * 2000; // 2-4 seconds for natural human pause
        const nextTotalDelay = (animationDuration * 1000) + nextThinkingDelay;
        nextResponseTimeout = setTimeout(processNextResponse, nextTotalDelay);
    }
    
    // Start generating the first background response while first animation is playing
    let backgroundResponsePromise = generateDebateResponse(null, currentEntity);
    
    // Start the cycle after first response animation finishes
    // Calculate delay based on first response
    const firstResponse = debateHistory[debateHistory.length - 1];
    if (firstResponse) {
        const firstAnimationDuration = calculateAnimationDuration(firstResponse.text, 0.25);
        const firstThinkingDelay = 2000 + Math.random() * 2000; // 2-4 seconds for natural human pause
        const firstTotalDelay = (firstAnimationDuration * 1000) + firstThinkingDelay;
        nextResponseTimeout = setTimeout(processNextResponse, firstTotalDelay);
    } else {
        nextResponseTimeout = setTimeout(processNextResponse, 5000);
    }
}

