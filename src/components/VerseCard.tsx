import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Copy, Check } from 'lucide-react';
import { Verse, AppSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatHebrewVerse } from '../lib/speech';

const VERSE_IMAGES: Record<string, string> = {
  // Chapter 1
  '1_1': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A9%D7%9E%D7%99%D7%99%D7%9D%D7%9D/BCO.caeefb25-dbe2-4319-8cbf-78c73b2a38dd.png?auto=format&fit=crop&w=600&q=80', // Sky/Shamayim
  '1_2': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80', // Earth/Eretz
  '1_3': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%92%D7%9F%D7%A2%D7%93%D7%9F/BCO.53816172-0759-472c-a63f-5e1452754cfb.png?auto=format&fit=crop&w=600&q=80', // Gan Eden
  '1_4': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%92%D7%99%D7%94%D7%A0%D7%95%D7%9D/Copilot_20260715_230719.png?auto=format&fit=crop&w=600&q=80', // Gehenna/Deep caverns
  '1_5': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%9E%D7%93%D7%91%D7%A8/BCO.b7612200-67b0-45f2-b931-c3aef77052eb.png?auto=format&fit=crop&w=600&q=80', // Desert/Midbar
  '1_6': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A9%D7%93%D7%95%D7%AA/photo-1495107334309-fcf20504a5ab.avif?auto=format&fit=crop&w=600&q=80', // Fields/Sadoht
  '1_7': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%9E%D7%99%D7%9D/BCO.115fe902-4713-4b99-97f9-a2ad39e75056.png?auto=format&fit=crop&w=600&q=80', // Waters/Mayim
  '1_8': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%99%D7%9E%D7%99%D7%9D/BCO.1fdbe155-9b25-4432-88d7-c7198d34833d.png?auto=format&fit=crop&w=600&q=80', // Seas/Yamim
  '1_9': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A0%D7%94%D7%A8%D7%95%D7%AA/BCO.fed1810d-6803-44fd-8ab5-f83acef6099e.png?auto=format&fit=crop&w=600&q=80', // Rivers/Neharot
  '1_10': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%9E%D7%A2%D7%99%D7%99%D7%9F%D7%90%D7%90/flooded-industrial-granite-career-with-waterfalls_419896-864.avif?auto=format&fit=crop&w=600&q=80', // Springs/Maayanot

  // Chapter 2
  '2_1': 'https://6a56a054cec0a76b214808b3.imgix.net/huo1/ChatGPT%20Image%20Aug%2012,%202026,%2010_20_05%20PM.png?auto=format&fit=crop&w=600&q=80', // Day/Yom
  '2_2': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', // Night/Laylah
  '2_3': 'https://6a56a054cec0a76b214808b3.imgix.net/Sun/1000225247.png?auto=format&fit=crop&w=600&q=80', // Sun/Shemesh
  '2_4': 'https://6a56a054cec0a76b214808b3.imgix.net/Moon/1000225248.jpg?auto=format&fit=crop&w=600&q=80', // Moon/Yareach
  '2_5': 'https://6a56a054cec0a76b214808b3.imgix.net/stars/BCO.31edfaa7-4c5d-497c-a956-7e9853f4959a.png?auto=format&fit=crop&w=600&q=80', // Stars/Kochavim
  '2_6': 'https://6a56a054cec0a76b214808b3.imgix.net/cloud1/BCO.98306390-f77f-44dd-98cc-a17be44a4516.png?auto=format&fit=crop&w=600&q=80', // Thick clouds/Avim
  '2_7': 'https://6a56a054cec0a76b214808b3.imgix.net/ananan/clouds-floating-sky-sunset_361322-1601.jpg?auto=format&fit=crop&w=600&q=80', // Clouds of Glory/Anane Kavod
  '2_8': 'https://6a56a054cec0a76b214808b3.imgix.net/wind/drawing-tree-with-leaves-blowing-wind-is-creative_922357-40501.jpg?auto=format&fit=crop&w=600&q=80', // Wind/Ruach
  '2_9': 'https://6a56a054cec0a76b214808b3.imgix.net/barak/BCO.06a11798-6968-4a97-a43c-452221ed3137.png?auto=format&fit=crop&w=600&q=80', // Lightning/Brakim
  '2_10': 'https://6a56a054cec0a76b214808b3.imgix.net/tal/morning-splendor-dew-green-leaf_1123377-2070.jpg?auto=format&fit=crop&w=600&q=80', // Dew/Tal
  '2_11': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%92%D7%A9%D7%9D/nature-photo-rainy-day_935395-74218.avif?auto=format&fit=crop&w=600&q=80', // Rains/Geshamim

  // Chapter 3
  '3_1': 'https://6a56a054cec0a76b214808b3.imgix.net/treee/yellow-green-oak-tree-sunrays-autumn-city-park_392053-1872.avif?auto=format&fit=crop&w=600&q=80', // Trees/Ilanot
  '3_2': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%92%D7%A4%D7%9F/ripe-dark-grapes-vine-with-autumn-leaves_84443-83869.avif?auto=format&fit=crop&w=600&q=80', // Vine/Gefen
  '3_3': 'https://6a56a054cec0a76b214808b3.imgix.net/fig/closeup-ripe-figs-tree-branch-with-green-leaves_588826-3859.avif?auto=format&fit=crop&w=600&q=80', // Fig/Te\'enah
  '3_4': 'https://6a56a054cec0a76b214808b3.imgix.net/rhnui/ripe-pomegranates-hanging-from-tree-branch-golden-sunlight_84443-72879.avif?auto=format&fit=crop&w=600&q=80', // Pomegranate/Rimon
  '3_5': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA%D7%9E%D7%A8/sweet-dates-clay-plate-stone-tile-wooden-background_176474-5655.avif?auto=format&fit=crop&w=600&q=80', // Date/Tamar
  '3_6': 'https://6a56a054cec0a76b214808b3.imgix.net/apple/fresh-red-apple-hanging-from-tree-branch-orchard_84443-84257.avif?auto=format&fit=crop&w=600&q=80', // Apple/Tapuach
  '3_7': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A9%D7%99%D7%91/image.jpg?auto=format&fit=crop&w=600&q=80', // Wheat/Chitah
  '3_8': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A9%D7%A2%D7%95%D7%A8%D7%99%D7%9D/3529114f-77b5-458d-b5c7-633b19f51648.png?auto=format&fit=crop&w=800&h=500&q=80', // Barley/Shibolet seorim
  '3_9': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%97%D7%99%D7%98%D7%94%D7%94/sunset-wheat-field.jpg?auto=format&fit=crop&w=600&q=80', // Other stalks/Shibolim
  '3_10': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%99%D7%A8%D7%A7/basket-tomatoes-peppers-with-yellow-green-pepper_979014-13255.avif?auto=format&fit=crop&w=600&q=80', // Vegetables/Yrakot
  '3_11': 'https://6a56a054cec0a76b214808b3.imgix.net/sat/morning-sunlight-falls-lush-green-grass-dew-dew-sparkles-like-diamond-soft-light_1092841-6315.avif?auto=format&fit=crop&w=600&q=80', // Grasses/Deshaim

  // Chapter 4
  '4_1': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA%D7%A8%D7%A0%D7%9233/47cbc60c-44c2-4a65-8d0c-99f079f1f700.png?auto=format&fit=crop&w=600&q=80', // Rooster/Tarnegol
  '4_2': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA6/photorealistic-view-rooster-with-beak-feathers%20(1).jpg?auto=format&fit=crop&w=600&q=80', // Rooster - First Voice
  '4_3': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA5/photorealistic-view-rooster-with-beak-feathers.jpg?auto=format&fit=crop&w=600&q=80', // Rooster - Second Voice
  '4_4': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA8/photorealistic-view-rooster-with-beak-feathers%20(2).jpg?auto=format&fit=crop&w=600&q=80', // Rooster - Third Voice
  '4_5': 'https://6a56a054cec0a76b214808b3.imgix.net/tarne/cinematic-still-majestic-black-rooster-crowing-shot-with-red-komodo-camera_958297-20076.avif?auto=format&fit=crop&w=600&q=80', // Rooster - Fourth Voice
  '4_6': 'https://6a56a054cec0a76b214808b3.imgix.net/,rbdd/photorealistic-view-rooster-with-beak-feathers.jpg?auto=format&fit=crop&w=600&q=80', // Rooster - Fifth Voice
  '4_7': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA7/image.jpg?auto=format&fit=crop&w=600&q=80', // Rooster - Sixth Voice
  '4_8': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA9/rooster-with-red-comb-stands-field-grass_25996-8066.jpg?auto=format&fit=crop&w=600&q=80', // Rooster - Seventh Voice
  '4_9': 'https://6a56a054cec0a76b214808b3.imgix.net/tar/rooster-perched-fence-with-autumnal-background_1287986-4990.avif?auto=format&fit=crop&w=600&q=80', // Hen/Tarnegolet
  '4_10': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%98%D7%9D%D7%9E/1d9b03df-22e6-438e-87a2-fe9d9d412798.png?auto=format&fit=crop&w=800&h=500&q=80', // Dove/Yonah 1
  '4_11': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%99%D7%95%D7%A0%D7%95%D7%94%D7%A0%D7%94/cb4e1ea7-0d44-4d2d-8b8f-647bfdba5771.png?auto=format&fit=crop&w=800&h=500&q=80', // Dove/Yonah 2
  '4_12': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A0%D7%A9%D7%A844/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Eagle/Nesher
  '4_13': 'https://6a56a054cec0a76b214808b3.imgix.net/sss/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Crane/Agur
  '4_14': 'https://6a56a054cec0a76b214808b3.imgix.net/mhpur/11bf8385-ca6b-4bdc-bece-ccc705178be7.png?auto=format&fit=crop&w=800&h=500&q=80', // Bird/Tzipor
  '4_15': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A7%D7%9A%D7%A7%D7%9A%D7%9A%D7%A7/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Swallow/Snunit
  '4_16': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%98%D7%A1%D7%99%D7%AA/24017db9-c91a-4c5d-9b01-5caa96b2412f.png?auto=format&fit=crop&w=800&h=500&q=80', // Swift/Tasit
  '4_17': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A6%D7%99%D7%9445/oREHp.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Desert bird/Tziyah
  '4_18': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A8%D7%A6%D7%99%5D%D7%99/bird-is-perched-branch-with-blurry-background_932242-2737.avif?auto=format&fit=crop&w=800&h=500&q=80', // Thrush/Ratzifi
  '4_19': 'https://6a56a054cec0a76b214808b3.imgix.net/jxhsv/c1d05593-cb6d-4f02-b9cf-a8473b5652aa.png?auto=format&fit=crop&w=800&h=500&q=80', // Stork/Chasida
  '4_20': 'https://6a56a054cec0a76b214808b3.imgix.net/gurc/beautiful-picture-bird-raven-crow-autumn-nature-corvus-frugilegus_926199-2569533.avif?auto=format&fit=crop&w=800&h=500&q=80', // Raven/Orev
  '4_21': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%96%D7%A8%D7%96%D7%A82/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Starling/Zarzir
  '4_22': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%90%D7%95%D7%96%D7%96/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Domestic goose/Avaz shebabayit
  '4_23': 'https://6a56a054cec0a76b214808b3.imgix.net/tuz4/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Wild goose/Avaz habar
  '4_24': 'https://6a56a054cec0a76b214808b3.imgix.net/prud/close-up-cute-baby-chicks.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Chicks/Progiot
  '4_25': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A8%D7%97%D7%9E%D7%94/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Vulture/Rachamah
  '4_26': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A4%D7%A8%D7%A4%D7%A8/butterfly-flower_55883-8652.avif?auto=format&fit=crop&w=800&h=500&q=80', // butterfly/Tziporet kramim
  '4_27': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%97%D7%A1%D7%99%D7%9C/grasshopper-goldenrod_387864-3133.avif?auto=format&fit=crop&w=800&h=500&q=80', // Locust/Chasil
  '4_28': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%9B%D7%9B%D7%9B%D7%9B%D7%9B%D7%9B/female-tenerife-lizard-gallotia-galloti-eisentrauti-rock-close-view-tenerife_137628-953.avif?auto=format&fit=crop&w=800&h=500&q=80', // Gecko/Smamit
  '4_29': 'https://6a56a054cec0a76b214808b3.imgix.net/fly/macro-fly-green_10221-5098.avif?auto=format&fit=crop&w=800&h=500&q=80', // Fly/Zbuv
  '4_30': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%AA%D7%A0%D7%99%D7%9F/black-american-alligator-crawling-grass-sunlight-with-blurry-background.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Sea monsters/Taninim
  '4_31': 'https://6a56a054cec0a76b214808b3.imgix.net/whake/beautiful-whale-crossing-ocean.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Leviathan
  '4_32': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%93%D7%92/49445dc0-014d-45d4-be1f-0a2d83b084a7.png?auto=format&fit=crop&w=800&h=500&q=80', // Fish/Dagim
  '4_33': 'https://6a56a054cec0a76b214808b3.imgix.net/mprs/dumpy-frob-wood-intropical-garden_103127-1220.avif?auto=format&fit=crop&w=800&h=500&q=80', // Frog/Tzefardea

  // Chapter 5
  '5_1': 'https://6a56a054cec0a76b214808b3.imgix.net/fcav/ChatGPT%20Image%20Aug%2011,%202026,%2010_17_01%20PM.png?auto=format&fit=crop&w=800&h=500&q=80', // Small pure cattle/Behemah dakah tehorah
  '5_2': 'https://6a56a054cec0a76b214808b3.imgix.net/prv/photorealistic-view-cow-grazing-nature-outdoors.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Large pure cattle/Behemah gasah tehorah
  '5_3': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%90%D7%A8%D7%A0%D7%91/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Small impure cattle/Behemah dakah temeah
  '5_4': 'https://6a56a054cec0a76b214808b3.imgix.net/zcrv/hartmann-mountain-zebra-stands-eating-trees_1610153-17653.avif?auto=format&fit=crop&w=800&h=500&q=80', // Large impure cattle/Behemah gasah temeah
  '5_5': 'https://6a56a054cec0a76b214808b3.imgix.net/dnk/one-dromedary-camel-standing-tranquil-wilderness-generated-by-ai.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Camel/Gamal
  '5_6': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A1%D7%95%D7%A12/56d5b6f4-1eea-4707-af38-4be057067dfb.png?auto=format&fit=crop&w=800&h=500&q=80', // Horse/Sus
  '5_7': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A4%D7%A8%D7%9333/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Mule/Pered
  '5_8': 'https://6a56a054cec0a76b214808b3.imgix.net/jnur/28d335d9-2cce-4c63-b847-2cf366b62d56.png?auto=format&fit=crop&w=800&h=500&q=80', // Donkey/Chamor
  '5_9': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A9%D7%95%D7%A84/2000_gi-676339b98aceb.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Ox/Shor
  '5_10': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A8%D7%9B%D7%9B%D7%A8/few-cows-meadow_1398-5043.avif?auto=format&fit=crop&w=800&h=500&q=80', // Wild beasts/Chayot hasadeh
  '5_11': 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=800&h=500&q=80', // Deer/Tzvi
  '5_12': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A4%D7%99%D7%9C/elephant-desert-neural-network-ai-generated_76080-34549.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Elephant/Pil
  '5_13': 'https://6a56a054cec0a76b214808b3.imgix.net/lion/majestic-lion-rock_1410957-71569.avif?auto=format&fit=crop&w=800&h=500&q=80', // Lion/Aryeh
  '5_14': 'https://6a56a054cec0a76b214808b3.imgix.net/sc/brown-bear-stands-tall-grassy-forest-meadow-showcasing-its-strength-sharp-claws-while-surrounded-by-blooming-wildflowers-soft-morning-light_965119-113376.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Bear/Dov
  '5_15': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%96%D7%90%D7%91/majestic-wolf-forest_1410957-96861.avif?auto=format&fit=crop&w=800&h=500&q=80', // Wolf/Zeeve
  '5_16': 'https://6a56a054cec0a76b214808b3.imgix.net/augk2/red-fox-standing-tall-grass-autumn-forest_206619-6567.avif?auto=format&fit=crop&w=800&h=500&q=80', // Fox/Shual
  '5_17': 'https://6a56a054cec0a76b214808b3.imgix.net/zrzrzr/full-shot-greyhound-dog-with-blurry-background_23-2149901483.avif?auto=format&fit=crop&w=800&h=500&q=80', // Greyhound/Zarzir chayah
  '5_18': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%91%D7%A9%D7%90/e009dc43-770d-4c93-aad7-d09bca5f9126.png?auto=format&fit=crop&w=800&h=500&q=80', // Cat/Chatul

  // Chapter 6
  '6_1': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A9%D7%A8%D7%A5/bug-branch_181624-34698.avif?auto=format&fit=crop&w=800&h=500&q=80', // Creeping things/Sheratzim
  '6_2': 'https://img.magnific.com/premium-photo/beautiful-bird-flowers_54368-19.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Worms of creeping things/Elim shebasheratzim
  '6_3': 'https://6a56a054cec0a76b214808b3.imgix.net/vja/blue-viper-snake-closeup-face-head-viper-snake-blue-insularis.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Snake/Nachash
  '6_4': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A2%D7%A7%D7%A8%D7%91/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Scorpion/Akrav
  '6_5': 'https://6a56a054cec0a76b214808b3.imgix.net/ackuk/realistic-snail-nature.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Snail/Shablul
  '6_6': 'https://6a56a054cec0a76b214808b3.imgix.net/ant/ant-colony-works-together-gather-food-generated-by-ai.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Ant/Nemalah
  '6_7': 'https://6a56a054cec0a76b214808b3.imgix.net/gfcr/fluffy-rodent-sitting-green-autumn-grass-generated-by-ai.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Mouse/Achbar
  '6_8': 'https://6a56a054cec0a76b214808b3.imgix.net/%D7%A8%D7%95%D7%90%D7%90/image.jpg?auto=format&fit=crop&w=800&h=500&q=80', // Weasel/Chuldah
  '6_9': 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&h=500&q=80', // Dogs/Kelavim
};

function getVerseImage(id: string): string {
  return VERSE_IMAGES[id] || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80';
}

interface VerseCardProps {
  key?: string;
  verse: Verse;
  chapterId: number;
  settings: AppSettings;
  onShowNotification: (message: string) => void;
  activePlayingVerseId: string | null;
  onPlayToggle: (verse: Verse, chapterId: number) => void;
}

export default function VerseCard({
  verse,
  chapterId,
  settings,
  onShowNotification,
  activePlayingVerseId,
  onPlayToggle,
}: VerseCardProps) {
  const isPlaying = activePlayingVerseId === verse.id;
  const isOtherPlaying = activePlayingVerseId !== null && !isPlaying;
  const [copied, setCopied] = useState(false);

  // Preload TTS voices for mobile browsers
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, []);

  // Map font settings to classes
  const fontClass = {
    heebo: 'font-heebo',
    frank: 'font-frank',
    hadassah: 'font-hadassah',
    david: 'font-david',
    rubik: 'font-rubik',
    varela: 'font-varela',
    amatic: 'font-amatic',
  }[settings.fontFamily] || 'font-frank';
  
  const fontSizeClasses = {
    sm: { title: 'text-[21px] md:text-[23px]', hebrew: 'text-[18px] md:text-[19px]' },
    base: { title: 'text-[23px] md:text-[26px]', hebrew: 'text-[20px] md:text-[22px]' },
    lg: { title: 'text-[25px] md:text-[30px]', hebrew: 'text-[22px] md:text-[25px]' },
    xl: { title: 'text-[26px] md:text-[32px]', hebrew: 'text-2xl md:text-[28px]' },
    '2xl': { title: 'text-[33px] md:text-[40px]', hebrew: 'text-3xl' },
  }[settings.fontSize];

  // Copy to Clipboard
  const handleCopy = () => {
    const formattedVerse = formatHebrewVerse(verse.verseHebrew);
    const textToCopy = `${verse.titleHebrew}
    
${formattedVerse} (${verse.sourceHebrew})

שותף מתוך אפליקציית פרק שירה`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    onShowNotification('הפסוק הועתק ללוח בהצלחה!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Text-To-Speech Toggle
  const handlePlayTTS = () => {
    if (isOtherPlaying) return;
    onPlayToggle(verse, chapterId);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ willChange: 'transform, opacity' }}
      id={`verse-card-${verse.id}`}
      className="verse-card-item bg-bg-card border border-border-color rounded-2xl p-5 md:p-6 shadow-3xs hover:shadow-2xs transition-all relative overflow-hidden text-text-primary"
    >
      {/* Card Header (Titles & Source) */}
      <div className="flex justify-between items-start gap-4 mb-5 border-b border-border-color/30 pb-4">
        <div className="text-right">
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 id={`verse-title-hebrew-${verse.id}`} className={`font-hadassah font-extrabold text-text-primary ${fontSizeClasses.title}`}>
              {verse.titleHebrew}
            </h4>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* TTS Button */}
          <button
            onClick={handlePlayTTS}
            disabled={isOtherPlaying}
            className={`p-2 rounded-lg border transition-all ${
              isOtherPlaying
                ? 'border-border-color/40 text-text-muted opacity-40 cursor-not-allowed'
                : isPlaying
                ? 'bg-primary-accent text-white border-primary-accent cursor-pointer'
                : 'border-border-color text-text-secondary hover:bg-bg-muted cursor-pointer'
            }`}
            title={isOtherPlaying ? 'הקראה פעילה בבריה אחרת' : isPlaying ? 'עצור הקראה' : 'הקראת שמע'}
          >
            {isPlaying ? <VolumeX className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg border border-border-color text-text-secondary hover:bg-bg-muted transition-all cursor-pointer"
            title="העתק פסוק"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Creature Image (Optional) */}
      {settings.showImages && (
        <div key={`verse-image-${verse.id}`} className="overflow-hidden mb-5">
          <div className="overflow-hidden rounded-xl h-44 md:h-80 w-full border border-border-color/10 relative bg-bg-muted/20 flex items-center justify-center">
            {/* Blurred background representation to fill empty space elegantly on desktop */}
            <div 
              className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110 pointer-events-none hidden md:block"
              style={{ backgroundImage: `url(${getVerseImage(verse.id)})` }}
            />
            <img
              src={getVerseImage(verse.id)}
              alt={verse.titleHebrew}
              className="w-full h-full object-cover md:object-contain hover:scale-101 transition-transform duration-500 ease-out select-none relative z-10"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Main Verse Content */}
      <div className="mb-[14px]">
        <div className="text-right">
          <p
            id={`verse-text-hebrew-${verse.id}`}
            className={`${fontClass} ${fontSizeClasses.hebrew} font-bold leading-relaxed text-text-primary select-all`}
            style={{ wordSpacing: '2px' }}
          >
            {formatHebrewVerse(verse.verseHebrew)}
          </p>
          <span className="text-xs uppercase tracking-wider text-text-secondary block mt-3 font-medium font-rubik">
            {verse.sourceHebrew}
          </span>
        </div>
      </div>

    </motion.article>
  );
}
