const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDPXqA3NFBR33QdwzSsJj-tpYl8x5t2_dE';

const usingGemini = !!GEMINI_API_KEY;
let genAI = null;
let model = null;

if (usingGemini) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Updated to correct model name
  console.log('[AI] Google Gemini client initialized with gemini-1.5-flash');
} else {
  console.log('[AI] GEMINI_API_KEY not set - using fallback generator');
}

async function generateNextScenario({ scenarioTitle, scenarioType, scenarioDescription, initialSituation, previousScenario, teamResponse, round, history }) {
  // Fallback heuristic based on scenario type
  if (!model) {
    console.log(`[AI] Fallback generation round=${round}, type=${scenarioType}`);
    if (scenarioType === 'theft') {
      return 'Security footage shows the suspect heading toward the parking garage. Two witnesses report seeing a suspicious vehicle. Your security team is ready to respond. What is your next action to secure the area and apprehend the suspect?';
    } else if (scenarioType === 'cyber') {
      return 'Network monitoring detects unusual data exfiltration patterns from multiple workstations. IT security identifies three compromised accounts. The threat may still be active in your systems. What immediate steps will you take?';
    } else if (scenarioType === 'fire') {
      return 'Thick smoke reduces visibility; some exits are blocked. You notice a fire alarm panel indicating multiple zones are affected. The building has three floors and approximately 50 occupants. What is your immediate action?';
    }
    return 'The situation is developing rapidly. New information indicates the scope may be larger than initially assessed. Resources are being mobilized. What are your immediate priorities and coordination steps?';
  }

  // Build detailed conversation history
  let conversationHistory = '';
  let allPreviousScenarios = [];
  if (history && history.length > 0) {
    conversationHistory = history.map((h, i) => 
      `Round ${h.round}:\nSituation: ${h.scenario}\nTeam Response: ${h.response}`
    ).join('\n\n');
    allPreviousScenarios = history.map(h => h.scenario);
  }
  
  // Add the most recent scenario to the list of scenarios to avoid repeating
  if (previousScenario && !allPreviousScenarios.includes(previousScenario)) {
    allPreviousScenarios.push(previousScenario);
  }

  // Map scenario type to context
  const scenarioContextMap = {
    'fire': 'FIRE EMERGENCY - Focus on fire spread, smoke, evacuation, firefighting, life safety, structural integrity',
    'theft': 'THEFT/SECURITY INCIDENT - Focus on suspect location, evidence preservation, witness statements, security response, asset recovery',
    'cyber': 'CYBER SECURITY INCIDENT - Focus on system compromise, data breach, network security, threat containment, forensics',
    'civil_unrest': 'CIVIL UNREST - Focus on crowd management, public safety, de-escalation, law enforcement coordination',
    'natural_disaster': 'NATURAL DISASTER - Focus on environmental hazards, evacuations, rescue operations, infrastructure damage',
    'custom': 'GENERAL INCIDENT - Focus on the specific context provided in the scenario description'
  };

  const scenarioContext = scenarioContextMap[scenarioType] || scenarioContextMap['custom'];

  const prompt = `You are an expert incident controller. Create CONCRETE, SPECIFIC emergency scenarios.

WRITING STYLE - CRITICAL:
❌ NO generic phrases like "situation continues to evolve", "new developments", "critical decisions required"
❌ NO meta-commentary about the scenario
❌ NO vague statements
✅ Write ONLY concrete, observable facts and specific details
✅ Use specific numbers, names, locations, times, objects
✅ Describe what IS HAPPENING right now, not what "might" or "could" happen
✅ Be direct and immediate

REQUIREMENTS:
1. Every scenario MUST be completely unique and different from previous rounds
2. Each scenario is a DIRECT CONSEQUENCE of the team's last action
3. Generate 120-200 characters
4. Include specific details: exact numbers, locations, people, objects, conditions
5. Stay strictly within ${scenarioType} incident type
6. NO repetition of previous scenarios or wording

SCENARIO PROGRESSION:
- If team response was effective → Show clear progress/improvement with NEW specific challenge
- If team response was weak → Show worsening with specific consequences
- Always introduce at least ONE new concrete element

========================================

SCENARIO TYPE: ${scenarioType.toUpperCase()}
CONTEXT: ${scenarioContext}

TRAINING SCENARIO: ${scenarioTitle}
${scenarioDescription ? `DESCRIPTION: ${scenarioDescription}` : ''}

INITIAL SITUATION (provides theme/setting):
${initialSituation}

========================================
YOU ARE NOW GENERATING ROUND ${round + 1}
========================================

COMPLETE HISTORY OF ALL PREVIOUS ROUNDS:
${conversationHistory || 'No previous rounds yet'}

MOST RECENT SITUATION (Round ${round}):
${previousScenario}

TEAM'S MOST RECENT ACTION/RESPONSE (Round ${round}):
${teamResponse}

❌ FORBIDDEN - YOU MUST NOT GENERATE ANY OF THESE SCENARIOS AGAIN:
${allPreviousScenarios.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

========================================
YOUR TASK: Generate Round ${round + 1}
========================================

ANALYZE THE TEAM'S RESPONSE:
"${teamResponse}"

YOUR TASK:
Based on the team's action "${teamResponse}", create the NEXT concrete situation.

WHAT TO INCLUDE:
- Specific observable facts (what someone sees/hears/discovers right now)
- Exact numbers (time elapsed, people involved, distances, quantities)
- Specific locations (room numbers, street names, building sections)
- Concrete objects and conditions (equipment status, physical observations)
- Direct consequences of the team's action

EXAMPLES OF GOOD VS BAD:
❌ BAD: "The situation continues with new complications requiring decisions"
✅ GOOD: "Security camera 3 shows the suspect entering the server room. Badge access logs indicate two unauthorized entries in the past 15 minutes"

❌ BAD: "New developments emerge that demand immediate response"  
✅ GOOD: "Flames spread to the electrical panel on the second floor. Eight occupants remain trapped in the northwest stairwell. Smoke detectors show temperatures rising to 400°F"

❌ BAD: "Critical circumstances change requiring coordinator action"
✅ GOOD: "The stolen laptop contains payroll data for 200 employees. Witness reports the suspect fled in a white Honda towards 5th Avenue"

NOW GENERATE Round ${round + 1}:
Write ONLY the concrete situation. NO phrases about "developments", "complications", or "decisions needed". Just describe what IS HAPPENING right now as a direct result of: "${teamResponse}"

Length: 120-200 characters. Return ONLY the situation description.`;

  try {
    console.log(`[AI] Calling Google Gemini API for Round ${round + 1}...`);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log(`[AI] Gemini API SUCCESS - Generated text length: ${text?.length} chars`);
    
    // Check if the generated text is too similar to any previous scenario
    const isTooSimilar = allPreviousScenarios.some(prevScenario => {
      const similarity = calculateSimilarity(text.toLowerCase(), prevScenario.toLowerCase());
      return similarity > 0.6; // More than 60% similar
    });
    
    if (isTooSimilar) {
      console.log('[AI] WARNING: Generated scenario too similar to previous ones, forcing variation...');
      // Ask for a completely different version
      const retryPrompt = `The following scenario was rejected for being too similar to previous ones:\n"${text}"\n\nGenerate a COMPLETELY DIFFERENT scenario for the same situation, using totally different words, focusing on a different aspect or location. Must be 120-200 characters and within ${scenarioType} context.`;
      
      const retryResult = await model.generateContent(retryPrompt);
      const retryResponse = await retryResult.response;
      const newText = retryResponse.text().trim();
      
      console.log(`[AI] Generated VARIED situation - Type: ${scenarioType}, Round ${round + 1}, Length: ${newText?.length} chars`);
      return newText && newText.length >= 100 ? newText : text;
    }
    
    console.log(`[AI] Generated next situation (Gemini) - Type: ${scenarioType}, Round ${round + 1}, Length: ${text?.length} chars`);
    
    // Ensure minimum length - if too short, ask for more detail
    if (text && text.length >= 100) {
      return text;
    } else {
      console.log('[AI] Response too short, requesting more detail...');
      // Ask Gemini to expand with specific details
      const expandPrompt = `Add more specific, concrete details to this scenario (numbers, locations, observations): "${text}"`;
      const expandResult = await model.generateContent(expandPrompt);
      const expandResponse = await expandResult.response;
      const expandedText = expandResponse.text().trim();
      return expandedText || text;
    }
  } catch (e) {
    console.error('[AI] ❌ Gemini API ERROR:', e?.message || e);
    console.error('[AI] Error type:', e?.name);
    console.error('[AI] API Key exists?', !!GEMINI_API_KEY);
    console.error('[AI] Model exists?', !!model);
    
    // Return specific fallbacks based on scenario type and round
    const theftFallbacks = [
      'Security camera footage shows the suspect at the north parking exit. Two vehicles left the area within 3 minutes. License plate partial: XYZ-4. The security office has blocked all badge access points.',
      'The stolen items include three laptops and a server backup drive. IT reports remote login attempts from an unknown IP address. Building security counted 47 people in the vicinity at the time.',
      'Witness from office 302 identifies a person wearing a blue jacket leaving through the service entrance at 2:47 PM. The access log shows that entrance was propped open for 12 minutes.',
      'Police arrive and request building evacuation of floors 2-4 for evidence collection. The suspect\'s abandoned backpack is found near the emergency stairwell. K-9 units are en route.',
      'Building management reports the suspect may have accessed the server room on floor 3. Security badge records show unauthorized entry at 3:15 PM. Backup systems detected a data transfer attempt.'
    ];
    
    const fireFallbacks = [
      'Smoke fills the third floor corridor. The fire alarm panel shows zones 3A, 3B, and 4A activated. Twelve people remain on the third floor. The sprinkler system on the east wing is malfunctioning.',
      'Flames breach the ceiling tiles in conference room 305. The main stairwell temperature reads 380°F. Five occupants report difficulty breathing. Emergency services estimate 8 minutes to arrival.',
      'The electrical room on floor 2 is now producing thick black smoke. Power to elevators has failed. Security cameras show six people trapped near the northwest exit. Fire spread rate is accelerating.',
      'Windows on the south side shatter from heat. Smoke detectors on floors 2, 3, and 4 are all activated. The building\'s standpipe system shows reduced water pressure. Seventeen occupants accounted for, three still missing.',
      'Fire has reached the HVAC system, spreading smoke throughout the building. The roof access door is jammed. Four people are visible on the second floor balcony. Oxygen levels in stairwell B are dropping.'
    ];
    
    const cyberFallbacks = [
      'System logs show 847 unauthorized file access attempts in the past 90 seconds. Three admin accounts are locked. The intrusion detection system flags traffic from IP 192.168.45.203. Database backups are offline.',
      'Ransomware encrypts files in the HR and Finance directories. Employee workstations on the third floor are displaying lock screens. The attacker demands payment within 6 hours. Network traffic shows ongoing data exfiltration.',
      'Firewall logs reveal 23 compromised user credentials. Malicious code is detected in the email server. Customer database queries spike to 450% normal volume. Security tokens for 89 users have been invalidated.',
      'The authentication server stops responding. VPN connections from 5 unknown locations attempt to access the payroll system. System administrator accounts show login activity from Mumbai and Kiev within 2 minutes.',
      'Antivirus software detects trojans on 16 workstations. The company website displays unauthorized content. Credit card transaction logs show unusual activity. IT identifies an open backdoor on port 8443.'
    ];
    
    let fallbacks = [];
    if (scenarioType === 'theft') fallbacks = theftFallbacks;
    else if (scenarioType === 'fire') fallbacks = fireFallbacks;
    else if (scenarioType === 'cyber') fallbacks = cyberFallbacks;
    else {
      fallbacks = [
        `Officers respond to the scene. Physical evidence is being collected. Three witnesses provide statements. The situation requires coordination with local authorities.`,
        `Emergency responders arrive and establish a perimeter. Equipment is deployed. Personnel are assigned to specific zones. Communication channels are established with command center.`,
        `Authorities secure the immediate area. Evidence collection begins. Multiple agencies coordinate response. Incident commander requests status update from all units.`
      ];
    }
    
    return fallbacks[round % fallbacks.length] || fallbacks[0];
  }
}

// Simple similarity calculation using word overlap
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 3));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Generate AI analysis for trainer session responses
async function generateAnalysis({ scenarioTitle, scenarioDescription, responsesByRound, teamMembers }) {
  if (!model) {
    console.log('[AI] Fallback analysis generation - model not available');
    return {
      behaviouralInterpretation: {
        emotionalTone: 'Analysis generation requires AI model configuration.',
        cognitiveState: 'Please configure Gemini API key to generate AI analysis.',
        behaviouralSignals: 'AI analysis unavailable.'
      },
      whatCouldBeBetter: 'AI analysis feature requires configuration.',
      teamPerformance: 'AI analysis feature requires configuration.'
    };
  }

  // Format responses for the prompt
  let responsesText = '';
  Object.keys(responsesByRound).sort((a, b) => Number(a) - Number(b)).forEach(roundNum => {
    const roundData = responsesByRound[roundNum];
    responsesText += `\n\nROUND ${roundNum}:\n`;
    responsesText += `Scenario Situation: ${roundData.scenario}\n`;
    responsesText += `Team Responses:\n`;
    roundData.responses.forEach(resp => {
      const displayName = resp.customName || resp.user;
      responsesText += `  - ${displayName}: ${resp.response || 'No response'}\n`;
    });
  });

  const teamMembersList = teamMembers.map(tm => {
    const username = tm.userId?.username || 'Unknown';
    const customName = tm.customName ? ` (${tm.customName})` : '';
    return `${username}${customName}`;
  }).join(', ');

  const prompt = `You are an expert behavioral analyst and crisis management trainer. Analyze the team's responses from a crisis management training session and provide comprehensive analysis.

SCENARIO: ${scenarioTitle}
${scenarioDescription ? `DESCRIPTION: ${scenarioDescription}` : ''}

TEAM MEMBERS: ${teamMembersList}

TEAM RESPONSES BY ROUND:${responsesText}

Your task is to provide a detailed analysis in the following format. Be specific, professional, and constructive. Focus on observable behaviors, decision-making patterns, and team dynamics.

Provide your analysis as a JSON object with these exact fields:
{
  "emotionalTone": "Detailed analysis of the emotional tone observed across all rounds...",
  "cognitiveState": "Assessment of cognitive state and decision-making processes...",
  "behaviouralSignals": "Key behavioral signals and patterns observed...",
  "whatCouldBeBetter": "Specific areas for improvement and alternative approaches...",
  "teamPerformance": "Evaluation of overall team performance and individual contributions..."
}

IMPORTANT:
- Each field should be 2-4 paragraphs (150-300 words)
- Be specific and reference actual responses when relevant
- Provide constructive feedback
- Focus on both individual and team dynamics
- Return ONLY valid JSON, no additional text before or after`;

  try {
    console.log('[AI] Calling Google Gemini API for analysis generation...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log('[AI] Gemini API SUCCESS - Generated analysis');
    
    // Try to extract JSON from the response
    let jsonText = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    const sanitizedJson = sanitizeJsonOutput(jsonText);
    const analysis = JSON.parse(sanitizedJson);
    
    // Ensure all required fields exist
    return {
      behaviouralInterpretation: {
        emotionalTone: analysis.emotionalTone || 'Analysis of emotional tone based on team responses.',
        cognitiveState: analysis.cognitiveState || 'Assessment of cognitive state and decision-making.',
        behaviouralSignals: analysis.behaviouralSignals || 'Key behavioral signals observed during the session.'
      },
      whatCouldBeBetter: analysis.whatCouldBeBetter || 'Areas for improvement identified from the session.',
      teamPerformance: analysis.teamPerformance || 'Overall team performance evaluation.'
    };
  } catch (e) {
    console.error('[AI] ❌ Gemini API ERROR for analysis:', e?.message || e);
    if (e?.stack) {
      console.error('[AI] Stack:', e.stack);
    }
    // Return fallback analysis
    return {
      behaviouralInterpretation: {
        emotionalTone: 'Unable to generate AI analysis. Please review the team responses manually and provide your assessment of the emotional tone observed throughout the session.',
        cognitiveState: 'Unable to generate AI analysis. Please assess the cognitive state and decision-making processes based on the team\'s responses.',
        behaviouralSignals: 'Unable to generate AI analysis. Please identify key behavioral signals and patterns from the session responses.'
      },
      whatCouldBeBetter: 'Unable to generate AI analysis. Please identify specific areas where the team could improve their crisis management approach.',
      teamPerformance: 'Unable to generate AI analysis. Please evaluate the overall team performance and individual contributions based on the responses provided.'
    };
  }
}

function sanitizeJsonOutput(text) {
  let cleaned = text
    .replace(/```json|```/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, '\'')
    .replace(/,\s*(\}|\])/g, '$1') // remove trailing commas
    .trim();
  return cleaned;
}

module.exports = { generateNextScenario, generateAnalysis, usingGemini };
