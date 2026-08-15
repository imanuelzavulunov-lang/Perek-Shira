import React from 'react';
import { AppSettings } from '../types';

interface BottomIntroSectionProps {
  settings?: AppSettings;
}

export default function BottomIntroSection({ settings }: BottomIntroSectionProps) {
  const fontClass = settings
    ? {
        heebo: 'font-heebo',
        frank: 'font-frank',
        hadassah: 'font-hadassah',
        david: 'font-david',
        rubik: 'font-rubik',
        varela: 'font-varela',
      }[settings.fontFamily] || 'font-frank'
    : 'font-frank';

  const fontSizeClass = settings
    ? {
        sm: 'text-[17px] md:text-[19px]',
        base: 'text-[19px] md:text-[21px]',
        lg: 'text-[21px] md:text-[24px]',
        xl: 'text-[23px] md:text-[27px]',
        '2xl': 'text-3xl md:text-4xl',
      }[settings.fontSize] || 'text-lg md:text-xl'
    : 'text-lg md:text-xl';

  const quotes = [
    {
      text: 'קְרִיאַת פִּרְקִי שִׁירָה מַגִּיעַ עַד גָּבְהֵי שָׁמַיִם לְהַשְׁפִּיעַ בַּמְּרוֹמִים שֶׁפַע בְּרָכָה וְטוֹבָה, מֵחֳלָאִים, פְּגָעִים רָעִים וּשְׁאַר מַרְעִין בִּישִׁין, תּוֹעַלְתּוֹ מְרֻבָּה, הַרְבֵּה עָשׂוּ וְעָלְתָה בְּיָדָם לִישׁוּעַת הַכְּלַל וְהַפְּרָט.',
      source: 'הגאון רבי מרדכי גרוס שליט"א ב"הכל ישבחוך"'
    },
    {
      text: 'וְרָאוּי לֵידַע כִּי כֹּל הַנִּבְרָאִים, אַף עַל פִּי שֶׁיֵּשׁ לָהֶם מַלְאַךְ מְמֻנֵּה עֲלֵיהֶם בַּשָּׁמַיִם אֵין לָהֶם פֶּה לוֹמַר שִׁירָה אֶלָּא עַל יְדֵי הָאָדָם שֶׁכֻּלָּם נֶאֱחָזִים בְּקוֹמָתוֹ כְּמוֹ שֶׁכָּתוּב ב"חֶסֶד לְאַבְרָהָם".',
      source: 'היעב"ץ זצוק"ל ב"זמרת הארץ"'
    },
    {
      text: 'כֹּל הָעוֹסֵק בְּפֶרֶק שִׁירָה זוֹכֶה לִהְיוֹת צוֹפֶה בַּמֶּרְכָּבָה וְזוֹכֶה לְיַמִּים טוֹבִים וְטוֹבוֹת כְּדֻגְמַת יְמוֹת מָשִׁיחַ בע"ה.',
      source: 'מוהר"ר יצחק וואלף ב"שיח יצחק"'
    },
    {
      text: 'גֹּדֶל מַעֲלַת אֲמִירַת פֶּרֶק שִׁירָה שִׁירַת הַבְּרִיאָה (פִּרְקֵי שִׁירָה) מְיֻחַס לְדָוִד הַמֶּלֶךְ וְלִשְׁלֹמֹה בְּנוֹ ע"ה מְסֻגָּל לְפַרְנְסָהּ וְלִרְפוּאָה וּלְהַצָּלָה מִכָּל רַע.',
      source: 'האר"י זצ"ל'
    },
    {
      text: 'הָאָדָם הַקּוֹרֵא פִּרְקִי שִׁירָה נוֹתֵן כֹּחַ לַמַּלְאָכִים וְהַשָּׁרִים שֶׁל כֹּל אֵלוֹ הַבְּרִיאוֹת שֶׁיֹּאמְרוּ אֵלּוּ הַשִּׁירוֹת וּמוֹשְׁכִים חַיּוּתָם לְכֹל הַתַּחְתּוֹנִים. אֲמִירַת פֶּרֶק שִׁירָה יֵשׁ בּוֹ יוֹתֵר שְׂאֵת וּמַעְלָה מִסֵּפֶר תְּהִלִּים, הוּא מְיֻחָד וּמְסֻגָּל לִדְבָרִים כּוֹלְלִים שֶׁל הֲצָלָה וּמַשִּׂיג אֵת תַּכְלִית בְּרִיאָתוֹ וְהוּא בֶּן הָעוֹלָם הַבָּא.',
      source: 'הרב המבי"ט בספרו "בית אלוקים"'
    }
  ];

  return (
    <div id="bottom-intro-section" className="w-full mt-12 mb-0 text-right text-text-primary animate-fade-in" dir="rtl">
      <div className="bg-bg-card border border-border-color rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
        
        {/* Header styled exactly like Yehi Ratzon, but permanently open without interactive cursor */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border-color/60">
          <div className="py-1">
            <h3 className="font-frank font-bold text-xl md:text-2xl text-text-primary tracking-wide leading-none">
              מַעֲלַת אֲמִירַת פֶּרֶק שִׁירָה
            </h3>
          </div>
        </div>

        {/* Quotes Area */}
        <div className="space-y-6 animate-fade-in">
          {quotes.map((q, idx) => (
            <div key={idx} className="border-r-4 border-primary-accent/40 pr-4 md:pr-6 hover:border-primary-accent transition-colors duration-200">
              <p className={`${fontClass} ${fontSizeClass} font-bold text-text-primary leading-relaxed mb-2`}>
                {q.text}
              </p>
              <cite className="block text-xs md:text-sm font-medium text-primary-accent not-italic">
                — {q.source}
              </cite>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
