import { Verse } from '../types';

export const prepareTextForSpeech = (text: string): string => {
  if (!text) return '';
  let speechText = text;

  // 1. Replace Divine Name (יהוה / יי / י"י) with הַשֵּׁם (preserving Hebrew prefixes like לַיהוָה -> לַהַשֵּׁם)
  speechText = speechText.replace(/([לבכהמ]?)(?:י[\u0591-\u05C7]*ה[\u0591-\u05C7]*ו[\u0591-\u05C7]*ה[\u0591-\u05C7]*)/g, (_, prefix) => {
    return prefix ? prefix + 'הַשֵּׁם' : 'הַשֵּׁם';
  });

  speechText = speechText.replace(/([לבכהמ]?)(?:י[\u0591-\u05C7]*["'`״׳]?י[\u0591-\u05C7]*)/g, (_, prefix) => {
    return prefix ? prefix + 'הַשֵּׁם' : 'הַשֵּׁם';
  });

  // 2. Normalize Chataf Vowels (חטפים) to standard vowels for browser TTS engine compatibility
  // (Browser SpeechSynthesis engines often skip or mispronounce Chataf Patach \u05B2, Chataf Segol \u05B1, Chataf Kamatz \u05B3)
  speechText = speechText.replace(/\u05B1/g, '\u05B6'); // Chataf Segol -> Segol
  speechText = speechText.replace(/\u05B2/g, '\u05B7'); // Chataf Patach -> Patach (e.g. וַחֲכָם -> וַחַכָם)
  speechText = speechText.replace(/\u05B3/g, '\u05B9'); // Chataf Kamatz -> Cholam

  // 3. Fix "Lech" (לֵךְ) pronunciation (prevent Hebrew TTS engines from reading it as "לְךָ" - lecha)
  speechText = speechText.replace(/([בחלמשו]?)ל\u05B5ךְ?/g, '$1לֵאךְ');

  // 4. Convert Kamatz Katan (קמץ קטן) to Cholam (חֹלָם \u05B9) for proper 'o' pronunciation by TTS engines
  // a) "Kol" (כָּל / כָל) with optional prefixes (וְכָל, לְכָל, בְּכָל, מִכָּל, שֶׁכָּל, הַכָּל)
  speechText = speechText.replace(/([בחלמשו]?)(כ[\u05BC]?)\u05B8(ל)/g, '$1$2\u05B9$3');

  // b) Known Kamatz Katan words & roots (חָכְמָה, קָרְבָּן, קָדְשׁוֹ, עָזִּי, רָנִּי, אָכְלָה, etc.)
  speechText = speechText.replace(/([בחלמשו]?)ח\u05B8כְמ/g, '$1ח\u05B9כְמ');
  speechText = speechText.replace(/([בחלמשו]?)ק\u05B8רְב/g, '$1ק\u05B9רְב');
  speechText = speechText.replace(/([בחלמשו]?)ק\u05B8דְשׁ/g, '$1ק\u05B9דְשׁ');
  speechText = speechText.replace(/([בחלמשו]?)ע\u05B8זּ/g, '$1ע\u05B9זּ');
  speechText = speechText.replace(/([בחלמשו]?)ר\u05B8נִּי/g, '$1ר\u05B9נִּי');
  speechText = speechText.replace(/([בחלמשו]?)א\u05B8כְל/g, '$1א\u05B9כְל');
  speechText = speechText.replace(/([בחלמשו]?)א\u05B8רְח/g, '$1א\u05B9רְח');
  speechText = speechText.replace(/([בחלמשו]?)צ\u05B8רְכ/g, '$1צ\u05B9רְכ');
  speechText = speechText.replace(/([בחלמשו]?)תּ?\u05B8כְנִ/g, '$1תּ\u05B9כְנִ');
  speechText = speechText.replace(/מ\u05B8רְדְּכַי/g, 'מ\u05B9רְדְּכַי');

  // 5. Pronunciation corrections for Sin (שׂ) vs Shin (ש / שׁ)
  // Explicitly handle "שֶׁבַּשָּׂדֶה" (she-ba-sadeh) and map Sin (שׂ / \u05C2) to Samekh ('ס')
  // so TTS engines pronounce 's' sound (like 'ס') instead of 'sh', while keeping prefix Shin ('שֶׁ' / 'שֶׁ') as 'sh'.
  speechText = speechText.replace(/(?:שֶׁ|שֶׁ|שֶ|שֶׁ)בַּשָּׂדֶה|(?:שֶׁ|שֶׁ|שֶ|שֶׁ)בַּשָּׂדֶה|שֶׁבַּשָּׁדֶה|שֶׁבַּשָּׁדֶה/g, 'שֶׁבַּסָּדֶה');
  speechText = speechText.replace(/שָּׂדֶה|שָׂדֶה|שָּׁדֶה/g, 'סָדֶה');

  // Convert any remaining Sin (\u05C2 or שׂ) to Samekh ('ס') for clear 's' pronunciation across all Hebrew TTS voices
  speechText = speechText.replace(/ש[\u05BC\u05B8\u05B7\u05B6\u05B5\u05B4\u05B0]*\u05C2/g, (match) => {
    return match.replace(/ש/g, 'ס').replace(/\u05C2/g, '');
  });
  speechText = speechText.replace(/שׂ/g, 'ס');

  // 4. Natural phrasing & clause pauses for biblical recitation
  speechText = speechText.replace(/(עָצֵל|עַצֵל)\s+(רְאֵה|רְאֵה)/g, '$1, $2');

  // 5. Strip Cantillation Marks (Ta'amei HaMikra: U+0591-U+05AF, Meteg U+05BD, Rafe U+05BF, Paseq U+05C0, Sof Pasuq U+05C3)
  speechText = speechText.replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C3\u05C6]/g, '');

  // 3. Convert Hebrew Maqaf (־) and hyphens to spaces to ensure continuous fluid speech
  speechText = speechText.replace(/[\u05BE\-]/g, ' ');

  // 4. Transform colons mid-sentence into commas for natural breathing pauses, and trailing colons into periods
  speechText = speechText.replace(/:\s*$/g, '.');
  speechText = speechText.replace(/:\s+/g, ', ');

  // 5. Clean up duplicate spaces
  speechText = speechText.replace(/\s+/g, ' ').trim();

  return speechText;
};

export const formatHebrewVerse = (text: string): string => {
  if (!text) return '';
  const verbs = ['אוֹמֵר', 'אוֹמֶרֶת', 'אוֹמְרִים', 'אוֹמְרוֹת', 'אֹמֵר'];
  let formatted = text;
  for (const verb of verbs) {
    const regex = new RegExp(`(${verb})\\s+(?!:)`, 'g');
    formatted = formatted.replace(regex, '$1: ');
  }
  
  formatted = formatted.replace(
    'אוֹמֶרֶת: יוֹנָה לִפְנֵי הַקָּדוֹשׁ בָּרוּךְ הוּא רִבּוֹנוֹ',
    'אוֹמֶרֶת יוֹנָה לִפְנֵי הַקָּדוֹשׁ בָּרוּךְ הוּא: רִבּוֹנוֹ'
  );
  
  return formatted;
};

export const getHebrewVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const hebrewVoices = voices.filter(
    v =>
      v.lang.toLowerCase().startsWith('he') ||
      v.lang.toLowerCase().startsWith('iw') ||
      v.lang.toLowerCase().includes('hebrew') ||
      v.name.toLowerCase().includes('hebrew') ||
      v.name.includes('עברית')
  );

  if (hebrewVoices.length === 0) return null;

  const maleVoice = hebrewVoices.find(
    v =>
      !/female|woman|zira|yalda|carmit|he-il-a|he-il-c|he-il-x-hea|he-il-x-hec|iw-il-a|iw-il-c|wavenet-a|wavenet-c|standard-a|standard-c/i.test(v.name) &&
      /david|yoni|asaf|avri|gadi|gil|ben|guy|roy|jonathan|daniel|thomas|male|man|he-il-b|he-il-d|he-il-e|he-il-x-heb|he-il-x-hed|iw-il-b|iw-il-d|iw-il-x-iwb|iw-il-x-iwd|wavenet-b|wavenet-d|standard-b|standard-d/i.test(v.name)
  );

  const nonFemaleVoice = hebrewVoices.find(
    v => !/female|woman|zira|yalda|carmit|he-il-a|he-il-c|he-il-x-hea|he-il-x-hec|iw-il-a|iw-il-c|wavenet-a|wavenet-c|standard-a|standard-c/i.test(v.name)
  );

  return maleVoice || nonFemaleVoice || hebrewVoices[0];
};

export const speakVerse = (
  verse: Verse,
  onEnd: () => void,
  onError: (err: any) => void
): SpeechSynthesisUtterance | null => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  window.speechSynthesis.cancel();
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  const formattedVerse = formatHebrewVerse(verse.verseHebrew);
  const speechVerse = prepareTextForSpeech(formattedVerse);
  const utterance = new SpeechSynthesisUtterance(speechVerse);
  utterance.lang = 'he-IL';
  utterance.rate = 0.90;
  utterance.pitch = 0.97;

  const selectedVoice = getHebrewVoice();
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onend = () => {
    onEnd();
  };

  utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
    if (event && (event.error === 'interrupted' || event.error === 'canceled')) {
      return;
    }
    onError(event);
  };

  window.speechSynthesis.speak(utterance);
  return utterance;
};
