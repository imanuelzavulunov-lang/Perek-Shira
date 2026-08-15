import React, { useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings } from '../types';

interface IntroSectionProps {
  settings: AppSettings;
}

export default function IntroSection({ settings }: IntroSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const fontClass = {
    heebo: 'font-heebo',
    frank: 'font-frank',
    hadassah: 'font-hadassah',
    david: 'font-david',
    rubik: 'font-rubik',
    varela: 'font-varela',
  }[settings.fontFamily] || 'font-frank';

  const fontSizeClass = {
    sm: 'text-[17px] md:text-[19px]',
    base: 'text-[19px] md:text-[21px]',
    lg: 'text-[21px] md:text-[24px]',
    xl: 'text-[23px] md:text-[27px]',
    '2xl': 'text-3xl md:text-4xl',
  }[settings.fontSize] || 'text-lg md:text-xl';

  const quotes = [
    {
      text: 'אָמַר רַבִּי, כָּל הָעוֹסֵק בְּפֶרֶק שִׁירָה בָּעוֹלָם הַזֶּה, זוֹכֶה לִלְמֹד וּלְלַמֵּד, לִשְׁמֹר וְלַעֲשׂוֹת וּלְקַיֵּם, וְתַלְמוּדוֹ מִתְקַיֵּם בְּיָדוֹ, וְנִצּוֹל מִיֵּצֶר הָרַע, וּמִפֶּגַע רַע, וּמֵחִבּוּט הַקֶּבֶר, וּמִדִּינָהּ שֶׁל גֵּיהִינֹּם, וּמֵחֶבְלוֹ שֶׁל מָשִׁיחַ, וּמַאֲרִיךְ יָמִים, וְזוֹכֶה לִימוֹת הַמָּשִׁיחַ, וּלְחַיֵּי הָעוֹלָם הַבָּא:',
      source: 'רבי יהודה הנשיא'
    },
    {
      text: 'תַּנְיָא אָמַר רַבִּי אֱלִיעֶזֶר, כָּל הָאוֹמֵר שִׁירָה זוֹ בָּעוֹלָם הַזֶּה, זוֹכֶה וְאוֹמְרוֹ לָעוֹלָם הַבָּא, שֶׁנֶּאֱמַר אָז יָשִׁיר מֹשֶׁה, שָׁר לֹא נֶאֱמַר אֶלָּא יָשִׁיר אוֹתוֹ לֶעָתִיד לָבוֹא:',
      source: 'רבי אליעזר הגדול'
    },
    {
      text: 'תָּנְיָא רַבִּי אֱלִיעֶזֶר הַגָּדוֹל אוֹמֵר, כָּל הָעוֹסֵק בְּפֶרֶק שִׁירָה זֶה בְּכָל יוֹם, מֵעִיד אֲנִי עָלָיו שֶׁהוּא בֶּן הָעוֹלָם הַבָּא, וְנִצּוֹל מִפֶּגַע רָע, וּמִיֵּצֶר הָרָע, וּמִדִּין קָשֶׁה, וּמִשָּׂטָן, וּמִכָּל מִינֵי מַשְׁחִית וּמַזִּיקִין. גְּמוֹר בְכָל לְבָבְךָ וּבְכָל נַפְשְׁךָ לָדַעַת דְּרָכַי וְלִשְׁמוֹר מִצְוֹתַי וְחֻקָּי. נְצוֹר תּוֹרָתִי בִּלְבָבֶךָ וְנֶגֶד עֵינֶיךָ תִּהְיֶה יִרְאָתִי. שְׁמוֹר פִּיךָ וּלְשׁוֹנְךָ מִכָּל חֵטְא וְאַשְׁמָה, וַאֲנִי אֶהְיֶה עִמְּךָ בְּכָל מָקוֹם שֶׁתֵּלֵךְ, וַאֲלַמֶּדְךָ שֵׂכֶל וּבִינָה מִכָּל דָּבָר. וֶהֱוֵי יוֹדֵעַ שֶׁכָּל מַה שֶּׁבָּרָא הַקָּדוֹשׁ בָּרוּךְ הוּא לֹא בְרָאוֹ כִּי אִם לִכְבוֹדוֹ, שֶׁנֶּאֱמַר כֹּל הַנִּקְרָא בִשְׁמִי וְלִכְבוֹדִי בְרָאתִיו יְצַרְתִּיו אַף עֲשִׂיתִיו.',
      source: 'רבי אליעזר הגדול'
    },
    {
      text: 'אָמְרוּ חז"ל עַל דָּוִד מֶלֶךְ יִשְׂרָאֵל, בְּשָׁעָה שֶׁסִּיֵּם סֵפֶר תְּהִלִּים זָחָה דַּעְתּוֹ עָלָיו וְאָמַר לִפְנֵי הַקָּדוֹשׁ בָּרוּךְ הוּא, יֵשׁ בְּרִיָּה שֶׁבָּרָאתָ בְּעוֹלָמְךָ שֶׁאוֹמֶרֶת שִׁירוֹת וְתִשְׁבָּחוֹת יוֹתֵר מִמֶּנִּי. בְּאוֹתָהּ שָׁעָה נִזְדַּמְנָה לוֹ צְפַרְדֵּעַ אַחַת, וְאָמְרָה לוֹ, דָּוִד אַל תָּזוּחַ דַּעְתְּךָ עָלֶיךָ, שֶׁאֲנִי אוֹמֶרֶת שִׁירוֹת וְתִשְׁבָּחוֹת יוֹתֵר מִמֶּךָּ. וְלֹא עוֹד אֶלָּא כָּל שִׁירָה שֶׁאֲנִי אוֹמֶרֶת מְמַשֶּׁלֶת עָלֶיהָ שְׁלֹשֶׁת אֲלָפִים מְשָׁלִים, שֶׁנֶּאֱמַר וַיְדַבֵּר שְׁלֹשֶׁת אֲלָפִים מָשָׁל וַיְהִי שִׁירוֹ חֲמִשָּׁה וָאָלֶף. וְלֹא עוֹד אֶלָּא שֶׁאֲנִי עוֹסֶקֶת בְּמִצְוָה גְדוֹלָה, וְזוּ הִיא הַמִּצְוָה שֶׁאֲנִי עוֹסֶקֶת בָּהּ, יֵשׁ בִּשְׂפַת הַיָּם מִין אֶחָד שֶׁאֵין פַּרְנָסָתוֹ כִּי אִם מִן הַמַּיִם, וּבְשָׁעָה שֶׁהוּא רָעֵב נוֹטְלֵנִי וְאוֹכְלֵנִי. זוּ הִיא הַמִּצְוָה. לְקַיֵּם מַה שֶּׁנֶּאֱמַר אִם רָעֵב שׂוֹנַאֲךָ הַאֲכִילֵהוּ לֶחֶם, וְאִם צָמֵא הַשְׁקֵהוּ מָיִם, כִּי גֶּחָלִים אַתָּה חוֹתֶה עַל רֹאשׁוֹ, וַיְיָ יְשַׁלֶּם לָךְ. אַל תִּקְרֵי יְשַׁלֶּם לָךְ אֶלָּא יַשְׁלִימֶנּוּ לָךְ:',
      source: 'ילקוט שמעוני, תהלים, רמז תתפ"ט'
    },
  ];

  return (
    <div id="intro-section" className="max-w-4xl mx-auto px-4 md:px-6 mb-6 text-right text-text-primary animate-fade-in" dir="rtl">
      <motion.div 
        className="bg-bg-card border border-border-color rounded-2xl shadow-3xs relative overflow-hidden px-5 md:px-6"
        animate={{
          paddingTop: '20px',
          paddingBottom: isExpanded ? '24px' : '20px',
        }}
        transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      >
        {/* Toggle Button / Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between pr-0 pl-0 focus:outline-none cursor-pointer group text-right gap-4 sm:gap-8 transition-all py-1"
        >
          <div className="flex items-center gap-2">
            <span className="text-[15.2px] md:text-[17.1px] font-bold text-primary-accent bg-primary-accent/10 px-3.5 py-2 rounded-full inline-flex items-center gap-2 transition-all group-hover:bg-primary-accent/15 whitespace-nowrap">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>הקדמה לפרק שירה</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary group-hover:text-text-primary transition-all text-[15.2px] md:text-[17.1px] font-bold pl-0.5">
            <span>{isExpanded ? 'הסתר' : 'הצג'}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-4.5 h-4.5 text-primary-accent" />
            </motion.div>
          </div>
        </button>

        {/* Expandable Quotes Area */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="intro-quotes"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
                className="mt-5 space-y-6 border-t border-border-color/40 pt-5"
              >
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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
