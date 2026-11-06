const DISCLAIMER =
  'This is general health information, not a medical diagnosis or prescription. Please consult a qualified clinician for advice specific to you.';

const EMERGENCY_PATTERNS = [
  /chest pain/i,
  /can(no|')t breathe/i,
  /difficulty breathing/i,
  /shortness of breath/i,
  /severe bleeding/i,
  /bleeding (a lot|heavily)/i,
  /stroke/i,
  /face droop/i,
  /slurred speech/i,
  /sudden weakness/i,
  /suicid/i,
  /kill myself/i,
  /self[- ]harm/i,
  /unconscious/i,
  /passed out/i,
  /seizure/i,
  /anaphyla/i,
  /throat (is )?closing/i,
  /poison/i,
  /overdose/i,
  /broken bone/i,
  /head injury/i,
  /severe head/i,
  /pregnan.*bleed/i,
  /baby.*not breathing/i,
];

const DIAGNOSIS_PATTERNS = [
  /diagnos/i,
  /what('s| is) wrong with me/i,
  /do i have (cancer|diabetes|covid|a disease|an infection)/i,
  /is it (cancer|diabetes|covid|serious)/i,
  /prescribe/i,
  /what (medicine|medication|tablet|antibiotic|dose|dosage|drug)/i,
  /which (medicine|medication|tablet|antibiotic)/i,
  /should i take (medicine|medication|antibiotic|tablets?|paracetamol|ibuprofen)/i,
  /give me (medicine|medication|a prescription|antibiotics?)/i,
];

const TOPICS = [
  {
    key: 'fever',
    keywords: /fever|temperature|chills/i,
    category: 'symptom',
    reply:
      '**Fever** is usually the body’s immune response to an infection.\n\n**General self-care**\n• Rest and drink fluids regularly (water, oral rehydration solution, clear soups).\n• Wear light clothing and keep the room comfortably cool.\n• Paracetamol may be used for comfort by many adults, but follow the label, respect the maximum daily dose, and check with a pharmacist if you take other medicines or have liver/kidney problems.\n\n**Red flags — get urgent care**\n• Fever above 39.5°C (103°F) that does not respond to treatment\n• Stiff neck, confusion, rash, trouble breathing or severe dehydration\n• Fever lasting more than 3 days, or any fever in a baby under 3 months\n• Fever in someone with a weakened immune system\n\n**When to see a doctor:** if symptoms are worsening, persistent, or you are unsure. A clinician can examine you and decide whether tests are needed.',
  },
  {
    key: 'headache',
    keywords: /headache|migraine|head pain/i,
    category: 'symptom',
    reply:
      '**Headaches** are common and often linked to stress, dehydration, sleep changes, eye strain or migraines.\n\n**General self-care**\n• Drink water, eat regularly and rest in a quiet, dimly lit room.\n• Apply a cool compress to the forehead; gentle neck stretches can help tension headaches.\n• Keep a headache diary (timing, triggers, sleep, screen time) — this is valuable for your doctor.\n• Avoid relying on painkillers more than a couple of days per week without medical advice, as overuse can worsen headaches.\n\n**Red flags — get emergency care**\n• Sudden “worst-ever” headache, or a thunderclap headache\n• Headache with fever and stiff neck, weakness, numbness, vision loss, confusion or after a head injury\n• A new persistent headache in pregnancy or after age 50\n\n**When to see a doctor:** frequent or disabling headaches, or any headache that changes pattern.',
  },
  {
    key: 'cold',
    keywords: /cold|flu|cough|sore throat|runny nose|congestion|sneez/i,
    category: 'symptom',
    reply:
      '**Cold and flu symptoms** are usually caused by viral infections and often improve within 7–10 days.\n\n**General self-care**\n• Rest, stay hydrated and use warm salt-water gargles for a sore throat.\n• Steam inhalation or saline nasal spray can ease congestion.\n• Honey in warm water may soothe a cough in adults and children over 1 year (never give honey to infants under 1).\n• Antibiotics do not treat viral colds. They should only be used when a clinician prescribes them.\n\n**Red flags**\n• Difficulty breathing, chest pain or lips turning blue\n• High fever that persists beyond 3 days\n• Severe dehydration, drowsiness or confusion\n• Symptoms worsening after initially improving\n\n**When to see a doctor:** persistent cough over 3 weeks, recurrent symptoms, or if you have asthma, COPD or a weakened immune system.',
  },
  {
    key: 'stomach',
    keywords: /stomach|abdominal|nausea|vomit|diarrh|constipat|indigestion|acidity|acid reflux|gas /i,
    category: 'symptom',
    reply:
      '**Digestive symptoms** can have many causes, including infections, food intolerance, stress, acid reflux or constipation.\n\n**General self-care**\n• Sip fluids and consider oral rehydration solution if you have vomiting or diarrhoea.\n• Eat bland, small meals; avoid very fatty, spicy or greasy food temporarily.\n• For constipation, increase fibre and water and stay physically active.\n• Avoid self-starting antibiotics for diarrhoea — most cases are viral.\n\n**Red flags — urgent care**\n• Severe or persistent abdominal pain, especially on the right lower side\n• Blood in vomit or stool, black stools, or vomiting blood\n• Signs of dehydration (very dark urine, dizziness, no urine for 8+ hours)\n• High fever, rigid abdomen, or pain after an injury\n\n**When to see a doctor:** symptoms lasting more than a few days, recurring symptoms, or any red flag.',
  },
  {
    key: 'blood-pressure',
    keywords: /blood pressure|hypertension|bp\b|systolic|diastolic/i,
    category: 'lifestyle',
    reply:
      '**Blood pressure** is best assessed with repeated, correctly measured readings — not a single value.\n\n**Healthy habits that support blood pressure**\n• Reduce added salt and highly processed foods.\n• Aim for 150 minutes of moderate activity per week, as advised by your clinician.\n• Maintain a healthy weight, limit alcohol and avoid smoking.\n• Prioritise 7–9 hours of sleep and manage stress.\n• Take prescribed medication consistently and do not stop it on your own.\n\n**Seek urgent help** for a reading around 180/120 or higher with chest pain, breathlessness, severe headache, weakness, confusion or vision changes.\n\n**When to see a doctor:** repeated readings above 130/80, or to review your treatment plan. Home monitors should be validated and the cuff correctly sized.',
  },
  {
    key: 'diabetes',
    keywords: /diabetes|blood sugar|glucose|hba1c|insulin|sugar level/i,
    category: 'lifestyle',
    reply:
      '**Blood sugar conditions** require individualised medical care. General information only:\n\n• Regular monitoring and consistent meals help stabilise glucose.\n• Choose fibre-rich foods, vegetables, whole grains and lean protein; limit sugary drinks.\n• Physical activity improves insulin sensitivity — discuss a safe plan with your clinician.\n• Never change insulin or diabetes medication doses without medical advice.\n• Keep up foot, eye, kidney and blood-pressure checks.\n\n**Urgent help:** very high glucose with vomiting, deep rapid breathing, confusion or fruity breath; or low glucose with sweating, shakiness, confusion or fainting. Follow your emergency plan and call for help.\n\n**When to see a doctor:** to interpret results, adjust treatment, or if you notice new symptoms.',
  },
  {
    key: 'asthma',
    keywords: /asthma|wheez|inhaler|breathless/i,
    category: 'symptom',
    reply:
      '**Asthma and breathing symptoms** can become serious quickly.\n\n• Use your reliever inhaler exactly as prescribed and keep it with you.\n• Avoid known triggers such as smoke, dust, strong odours and cold air.\n• Follow your written asthma action plan if you have one.\n• Do not smoke, and keep rooms well ventilated.\n\n**Call emergency services now** if you have severe breathlessness, cannot complete a sentence, lips/fingertips turn blue, the reliever is not helping, or symptoms are rapidly worsening.\n\n**When to see a doctor:** increasing reliever use, night-time symptoms, or needing a review of your preventer inhaler technique.',
  },
  {
    key: 'allergy',
    keywords: /allerg|hives|rash|itch|sneez|eczema/i,
    category: 'symptom',
    reply:
      '**Allergies** happen when the immune system overreacts to a trigger such as pollen, dust, food, pets or medication.\n\n• Identify and avoid triggers where possible.\n• Antihistamines can help mild hay fever or hives for many people — ask a pharmacist about suitability, interactions and drowsiness.\n• For eczema, use fragrance-free moisturiser and avoid harsh soaps and hot showers.\n• Keep a symptom diary to identify patterns.\n\n**Emergency signs of anaphylaxis:** swelling of the lips/tongue/throat, difficulty breathing, wheezing, widespread hives with dizziness or collapse. Use an adrenaline auto-injector if prescribed and call emergency services immediately.\n\n**When to see a doctor:** persistent or unexplained rashes, suspected food/drug allergy, or symptoms affecting daily life.',
  },
  {
    key: 'sleep',
    keywords: /sleep|insomnia|tired|fatigue|exhaust/i,
    category: 'lifestyle',
    reply:
      '**Sleep and fatigue** are closely linked to routine, stress and health conditions.\n\n**Sleep hygiene basics**\n• Keep a consistent sleep and wake time, including weekends.\n• Get morning daylight and limit caffeine after early afternoon.\n• Avoid screens and heavy meals close to bedtime.\n• Keep the bedroom dark, quiet and cool; get out of bed if awake for 20+ minutes and return when sleepy.\n• Aim for 7–9 hours for most adults.\n\n**When to see a doctor:** loud snoring with pauses in breathing, falling asleep during the day, persistent fatigue for over a month, or low mood. Fatigue can also reflect anaemia, thyroid problems or other conditions that need assessment.',
  },
  {
    key: 'nutrition',
    keywords: /diet|nutrition|eat|food|weight|obesity|protein|vitamin/i,
    category: 'lifestyle',
    reply:
      '**Balanced eating** supports energy and long-term health.\n\n• Fill half your plate with vegetables and fruit, a quarter with whole grains, and a quarter with protein.\n• Choose water as the default drink; limit sugary beverages.\n• Include fibre (beans, lentils, whole grains) and healthy fats (nuts, seeds, olive oil) in moderation.\n• Avoid extreme diets; sustainable changes matter more than quick fixes.\n• If you have a medical condition, food allergies, are pregnant or take medication, get individual advice from a dietitian or clinician.\n\n**When to see a professional:** unexplained weight loss, difficulty eating, or a need for a personalised plan.',
  },
  {
    key: 'exercise',
    keywords: /exercise|workout|gym|physical activity|walk|fitness/i,
    category: 'lifestyle',
    reply:
      '**Physical activity** supports heart, mental and metabolic health.\n\n• Aim for about 150 minutes of moderate activity per week, plus strength work twice weekly, if your clinician agrees.\n• Start gradually and warm up; progress slowly.\n• Choose activities you enjoy so you can stay consistent.\n• Stay hydrated and wear appropriate footwear.\n• Stop and seek medical advice if you develop chest pain, severe breathlessness, dizziness or unusual pain.\n\n**When to see a doctor:** before starting intense exercise if you have heart disease, uncontrolled blood pressure, diabetes complications, or have been inactive for a long time.',
  },
  {
    key: 'mental-health',
    keywords: /stress|anxiety|anxious|depress|panic|mental health|low mood|sad|burnout/i,
    category: 'lifestyle',
    reply:
      '**Mental health** deserves the same care as physical health.\n\n• Try slow breathing (in for 4, hold 4, out for 6) and regular gentle movement.\n• Keep a simple routine, stay connected with people you trust, and limit alcohol and excessive caffeine.\n• Write down worries and separate what you can act on today from what you cannot.\n• Talking therapy and, where appropriate, medication can be very effective — a clinician can help you choose.\n\n**If you are thinking about harming yourself, please call your local emergency number or a crisis helpline right now and stay with someone you trust.** In India, you can call Tele-MANAS at 14416. You are not alone.\n\n**When to see a professional:** symptoms lasting more than 2 weeks, affecting work/sleep, or any thoughts of self-harm.',
  },
  {
    key: 'pregnancy',
    keywords: /pregnan|period|menstru|obstetric|contracept/i,
    category: 'symptom',
    reply:
      '**Pregnancy and menstrual health** need personalised care.\n\n• Attend recommended antenatal check-ups and take prescribed supplements (for example folic acid) as directed.\n• Avoid alcohol, smoking and unprescribed medication in pregnancy; check any medicine with a clinician or pharmacist.\n• Track warning signs: heavy bleeding, severe abdominal pain, reduced fetal movement, severe headache with vision changes, swelling of face/hands, fever, or fluid leakage.\n• For menstrual changes, note cycle dates, flow and pain to discuss with your clinician.\n\n**Seek urgent care** for heavy bleeding, fainting, severe pain, or any of the pregnancy warning signs above.\n\n**When to see a doctor:** missed periods, new pelvic pain, unusual discharge, or questions about contraception.',
  },
  {
    key: 'skin',
    keywords: /skin|acne|pimple|mole|dandruff|hair fall/i,
    category: 'symptom',
    reply:
      '**Skin and hair concerns** are common and usually manageable, but some need assessment.\n\n• Use a gentle, fragrance-free cleanser and daily sunscreen (SPF 30+).\n• Avoid picking pimples or scrubbing affected skin; introduce new products one at a time.\n• For acne, non-comedogenic products and clinician-guided treatment work better than harsh home remedies.\n• Keep hair washing regular and avoid very tight hairstyles if hair loss is a concern.\n\n**See a doctor promptly** for a changing mole (asymmetry, irregular border, multiple colours, large size, bleeding), a spreading painful rash, or sudden hair loss with scaling.\n\n**When to see a dermatologist:** persistent acne, eczema, psoriasis, or any skin change that worries you.',
  },
  {
    key: 'back-pain',
    keywords: /back pain|neck pain|joint|arthritis|sprain|muscle pain/i,
    category: 'symptom',
    reply:
      '**Musculoskeletal pain** often improves with gentle activity rather than prolonged bed rest.\n\n• Keep moving gently and avoid heavy lifting initially.\n• Apply a heat pack for muscle tightness; use an ice pack for a new sprain (wrapped, not directly on skin).\n• Maintain good posture and set up your desk so the screen is at eye level.\n• Over-the-counter pain relief may suit some people, but check with a pharmacist about interactions and avoid overuse.\n\n**Urgent care** for back pain with loss of bladder/bowel control, numbness around the groin, progressive leg weakness, fever, or after significant trauma.\n\n**When to see a doctor:** pain lasting more than 2–3 weeks, recurring pain, or pain that limits daily activities.',
  },
  {
    key: 'vaccination',
    keywords: /vaccin|immunis|immuniz|booster|tetanus/i,
    category: 'general',
    reply:
      '**Vaccinations** are one of the most effective preventive health measures.\n\n• Keep a record of your vaccines and boosters; requirements vary by age, health conditions, travel and country.\n• Tetanus boosters are commonly recommended every 10 years (or sooner after certain wounds).\n• Annual influenza vaccination is recommended for many groups; ask your clinician whether it applies to you.\n• Mild soreness or low fever after vaccination is usually short-lived; serious reactions are rare.\n\n**Seek urgent care** for difficulty breathing, facial swelling, widespread hives or collapse after vaccination.\n\n**When to see a doctor:** to catch up on missed vaccines or plan travel vaccinations.',
  },
  {
    key: 'hydration',
    keywords: /water|hydrat|dehydrat|thirst/i,
    category: 'lifestyle',
    reply:
      '**Hydration** needs vary with body size, climate, activity and health conditions.\n\n• Drink regularly through the day; pale yellow urine is a reasonable practical guide for many adults.\n• Increase fluids in heat, during exercise, and with fever, vomiting or diarrhoea.\n• Oral rehydration solution is preferable to plain water for significant fluid loss.\n• People with heart or kidney conditions may need restricted fluids — follow their clinician’s advice.\n\n**Seek care** for dizziness, confusion, very little urine, rapid heartbeat or inability to keep fluids down.',
  },
  {
    key: 'cholesterol',
    keywords: /cholesterol|lipid|triglycerid|ldl|hdl/i,
    category: 'lifestyle',
    reply:
      '**Cholesterol** results need interpretation alongside your overall cardiovascular risk.\n\n• Reduce saturated and trans fats; choose vegetables, fruit, whole grains, beans, nuts and oily fish.\n• Stay active, avoid smoking and maintain a healthy weight.\n• Take cholesterol-lowering medication only as prescribed and do not stop without advice.\n• Ask your clinician what your target LDL should be, especially if you have diabetes or heart disease.\n\n**When to see a doctor:** to review results, family history of early heart disease, or new chest pain/breathlessness with exertion.',
  },
  {
    key: 'thyroid',
    keywords: /thyroid|hypothyroid|hyperthyroid|tsh/i,
    category: 'symptom',
    reply:
      '**Thyroid conditions** are diagnosed with blood tests and, sometimes, imaging.\n\n• Common symptoms can include fatigue, weight change, temperature sensitivity, constipation, palpitations and mood changes — but these overlap with many conditions.\n• Take thyroid medication exactly as prescribed, usually on an empty stomach and separated from calcium/iron supplements as directed.\n• Do not change the dose based on symptoms alone.\n• Keep follow-up tests on schedule.\n\n**When to see a doctor:** to interpret TSH/T3/T4 results, review symptoms, or adjust treatment. Seek urgent care for severe agitation, very fast heartbeat, fever or confusion.',
  },
  {
    key: 'covid',
    keywords: /covid|corona|sars/i,
    category: 'symptom',
    reply:
      '**COVID-19 and respiratory infections** range from mild to severe.\n\n• Rest, hydrate and monitor symptoms; rapid tests can help confirm infection.\n• Isolate according to current local public-health guidance and avoid contact with high-risk people.\n• Seek urgent care for breathing difficulty, chest pain, confusion, bluish lips, or inability to stay hydrated.\n• Antiviral treatment may be appropriate for some high-risk patients but requires a clinician.\n\n**When to see a doctor:** severe symptoms, high-risk conditions, pregnancy, or symptoms lasting beyond 10 days.',
  },
];

const EMERGENCY_REPLY = `⚠️ **This may be a medical emergency.**

Please call your local emergency services **right now**:
• India: **112** (all emergencies) or **108** (ambulance)
• USA: **911** • UK: **999** • EU: **112**

While waiting:
• Stay with the person and keep them calm.
• Do **not** drive yourself to hospital if you feel very unwell.
• Do not eat, drink or take new medication unless a dispatcher or clinician tells you to.
• If someone is unresponsive and not breathing normally, start CPR if you are trained and follow the dispatcher's instructions.

I'm an AI assistant and cannot assess or diagnose emergencies. Please contact a healthcare professional immediately.`;

const SAFETY_REPLY = `I can share general health information, but I can't diagnose a condition or prescribe medication — that needs a qualified healthcare professional who can examine you and review your history.

**What I can help with**
• Explaining general symptoms, prevention and self-care
• Preparing questions for your doctor
• Understanding when to seek urgent care
• Healthy lifestyle guidance

**Please don't start, stop or change any medication based on an AI response.** If you're concerned, book an appointment with a doctor or contact a pharmacist about medication safety.

If your symptoms are severe, sudden or worsening, please seek urgent medical care now.`;

const FALLBACK_REPLY = `I'm here to share general health information and help you prepare for a medical visit. I can't diagnose conditions or prescribe medication.

To point you in the right direction, could you tell me a little more?
• What symptoms are you experiencing?
• How long have they been present, and are they improving or worsening?
• Is there anything that makes them better or worse?

**For red flags** — chest pain, difficulty breathing, severe bleeding, sudden weakness, fainting, or thoughts of self-harm — please contact emergency services immediately.

For personalised advice, consider booking an appointment with one of our doctors.`;

const detectEmergency = (message) => EMERGENCY_PATTERNS.some((pattern) => pattern.test(message));
const detectDiagnosisRequest = (message) =>
  DIAGNOSIS_PATTERNS.some((pattern) => pattern.test(message));

const findTopic = (message) => TOPICS.find((topic) => topic.keywords.test(message));

const buildLocalReply = (message) => {
  if (detectEmergency(message)) {
    return { content: EMERGENCY_REPLY, category: 'emergency', flagged: true };
  }

  if (detectDiagnosisRequest(message)) {
    return { content: SAFETY_REPLY, category: 'safety', flagged: true };
  }

  const topic = findTopic(message);
  if (topic) {
    return {
      content: `${topic.reply}\n\n---\n_${DISCLAIMER}_`,
      category: topic.category,
      flagged: false,
    };
  }

  return { content: FALLBACK_REPLY, category: 'general', flagged: false };
};

const OPENAI_SYSTEM_PROMPT = `You are MediCare AI, a careful health information assistant inside a medical appointment platform.

STRICT RULES:
1. Never provide a definitive diagnosis. Never prescribe or recommend prescription medication, doses, or antibiotics. Suggest consulting a clinician or pharmacist.
2. If the message suggests an emergency (chest pain, difficulty breathing, severe bleeding, stroke signs, seizure, anaphylaxis, overdose, self-harm, pregnancy bleeding), immediately tell the user to call emergency services and give brief first-aid/stay-safe guidance.
3. Provide general, evidence-aligned health education. Be clear about uncertainty.
4. Ask brief clarifying questions when useful. Keep answers under 280 words.
5. Use plain language, short paragraphs and bullet points. Avoid alarming language.
6. End with a short reminder that this is general information, not medical advice.
7. Do not claim to be a doctor. Do not invent sources or statistics.
8. If the user asks about non-health topics, politely redirect to health questions.

Formatting: Markdown-like plain text with **bold** and • bullets is fine.`;

async function getOpenAIReply(message, history = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const recentHistory = history
      .filter((item) => ['user', 'assistant'].includes(item.role))
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        max_tokens: 600,
        messages: [
          { role: 'system', content: OPENAI_SYSTEM_PROMPT },
          ...recentHistory,
          { role: 'user', content: message },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty AI response');

    return { content, category: 'general', flagged: false };
  } catch (error) {
    clearTimeout(timeout);
    console.warn('[ai] OpenAI unavailable, using local health knowledge base:', error.message);
    return null;
  }
}

/**
 * Generates a safe assistant reply. Local safety checks run first so emergency
 * guidance is guaranteed even if an external model is unavailable.
 */
const generateReply = async (message, history = []) => {
  const emergency = detectEmergency(message);
  if (emergency) {
    return { content: EMERGENCY_REPLY, category: 'emergency', flagged: true };
  }

  if (process.env.OPENAI_API_KEY) {
    const aiReply = await getOpenAIReply(message, history);
    if (aiReply) {
      return {
        ...aiReply,
        content: `${aiReply.content}\n\n---\n_${DISCLAIMER}_`,
      };
    }
  }

  return buildLocalReply(message);
};

module.exports = {
  generateReply,
  detectEmergency,
  DISCLAIMER,
  EMERGENCY_REPLY,
};
