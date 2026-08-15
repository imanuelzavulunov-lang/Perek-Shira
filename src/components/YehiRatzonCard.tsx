import React from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { AppSettings } from '../types';

interface YehiRatzonCardProps {
  settings: AppSettings;
}

export default function YehiRatzonCard({ settings }: YehiRatzonCardProps) {
  const prayerText = `רִבּוֹן כָּל הָעוֹלָמִים, יְהִי רָצוֹן מִלְּפָנֶיךָ יי אֱלֹהַי וֶאֱלֹהֵי אֲבוֹתַי, שֶׁבִּזְכוּת פֶּרֶק שִׁירָה שֶׁקָּרָאתִי, שֶׁהוּא שִׁירַת הַדּוֹמֵם הַצּוֹמֵחַ וְהַחַי, וְהַמַּלְאָכִים הַמְּמֻנִּים עֲלֵיהֶם מֵאֵת הַשֵׁם יִתְבָּרֵךְ, שֶׁתְּהֵא אֲמִירָתוֹ כְּהַקְרָבַת קָרְבָּן עַל גַּבֵּי הַמִּזְבֵּחַ. שֶׁתְּהֵא שָׁעָה זוּ שְׁעַת רַחֲמִים, שְׁעַת הַקְשָׁבָה, שְׁעַת הַאֲזָנָה, וְנִקְרָאֲךָ וּתְעַנִּינוּ, נַעְתִּיר לְךָ וְהֵעָתֵר לָנוּ. שֶׁתִּהְיֶה עוֹלָה לְפָנֶיךָ אֲמִירַת פֶּרֶק שִׁירָה כְּאִלּוּ הִשַּׂגְנוּ כֹּל הַסּוֹדוֹת הַנִּפְלָאוֹת וְהַנּוֹרָאוֹת אֲשֶׁר הֵם חֲתוּמִים בּוֹ בְּכֹל תְּנָאָיו. הַחְזִירֵנוּ בִּתְשׁוּבָה שְׁלֵמָה לְפָנֶיךָ, וְנִזְכֶּה לְמָקוֹם שֶׁהַנְּפָשׁוֹת הָרוּחוֹת וְהַנְשָׁמוֹת נֶחְצָבוֹת מִשַּׁם, וּכְאִלּוּ עָשִׂינוּ כֹּל אַשֵּׁר מוּטָל עָלֵינוּ לְהַשִּׂיג, בֵּין בְּגִלְגּוּל זֶה בֵּין בְּגִלְגּוּלִים אֲחֵרִים, וּמַלֵּא כֹּל מִשְׁאֲלוֹת לִבֵּנוּ לְטוֹבָה (כָּאן יוֹסִיף בִּפְרָטִיּוּת מַה שֶׁנִּצְרַךְ) וְתִשְׁלַח בְּרָכָה הַצְלָחָה וְהַרְוָחָה בְּכֹל מֵעֲשֵׂה יָדֵינוּ, וְנִזְכֶּה לְשׁוֹרֵר לַעֲתִיד לָבוֹא, וְתַשִּׁיב שְׁכִינָתְךָ לְעִיר קָדְשְׁךָ בִּמְהֵרָה בְּיָמֵינוּ אָמֵן.`;

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: 'transform, opacity' }}
      id="yehi-ratzon-card"
      className="bg-bg-card border border-border-color rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden mt-12 text-right text-text-primary"
      dir="rtl"
    >

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-color/60">
        <div className="py-1">
          <h3 className="font-frank font-bold text-xl md:text-2xl text-text-primary tracking-wide leading-none">
            בַּקָּשָׁה לְאַחַר קְרִיאַת פֶּרֶק שִׁירָה
          </h3>
        </div>
      </div>

      {/* Prayer text itself - dynamic font settings */}
      <div className="bg-bg-app/45 rounded-xl p-5 md:p-6 border border-border-color/30 leading-relaxed text-text-primary select-text">
        <p className={`${fontClass} ${fontSizeClass} leading-relaxed font-bold select-text tracking-wide whitespace-pre-line text-justify`}>
          {prayerText}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-text-secondary/70">
        <span className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
          סגולה לישועה, רפואה ופרנסה
        </span>
        <span className="font-bold text-primary-accent">אָמֵן כֵּן יְהִי רָצוֹן!</span>
      </div>
    </motion.div>
  );
}
