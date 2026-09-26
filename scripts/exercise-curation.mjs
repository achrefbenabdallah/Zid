/**
 * Curated exercise list for Zid, built on free-exercise-db (public domain / Unlicense,
 * https://github.com/yuhonas/free-exercise-db). Each entry:
 *   [datasetId, muscleGroup, nameAr, howTo (EN), howToAr]
 * English names, equipment and images come from the dataset; the how-to text is our own
 * short beginner-friendly version. Run `npm run build:exercises` after editing.
 */
export const CURATION = [
  // ── Chest ──────────────────────────────────────────────────────────────────
  ['Barbell_Bench_Press_-_Medium_Grip', 'chest', 'ضغط البنش بالبار', 'Lie on a flat bench, lower the bar to mid-chest, then press it back up until your arms are straight.', 'استلقِ على البنش، أنزل البار إلى منتصف الصدر ثم ادفعه للأعلى حتى تستقيم ذراعاك.'],
  ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'chest', 'ضغط مائل بالبار', 'On a bench tilted 30–45°, lower the bar to your upper chest and press it back up.', 'على بنش مائل بزاوية ٣٠–٤٥°، أنزل البار إلى أعلى الصدر ثم ادفعه للأعلى.'],
  ['Decline_Barbell_Bench_Press', 'chest', 'ضغط منحدر بالبار', 'On a decline bench with your feet hooked, lower the bar to your lower chest and press up.', 'على بنش منحدر مع تثبيت القدمين، أنزل البار إلى أسفل الصدر ثم ادفعه للأعلى.'],
  ['Dumbbell_Bench_Press', 'chest', 'ضغط البنش بالدمبل', 'Lie flat holding dumbbells over your chest. Lower them to chest level with elbows at about 45°, then press up.', 'استلقِ ممسكاً الدمبل فوق صدرك، أنزلها لمستوى الصدر والمرفقان بزاوية ٤٥° تقريباً ثم ادفع للأعلى.'],
  ['Incline_Dumbbell_Press', 'chest', 'ضغط مائل بالدمبل', 'On an incline bench, press the dumbbells from shoulder level up over your upper chest.', 'على بنش مائل، ادفع الدمبل من مستوى الكتفين إلى الأعلى فوق أعلى الصدر.'],
  ['Dumbbell_Flyes', 'chest', 'تفتيح بالدمبل', 'Lying flat with elbows slightly bent, open your arms wide until you feel a chest stretch, then bring them back together like a hug.', 'مستلقياً مع ثني خفيف في المرفقين، افتح ذراعيك جانباً حتى تشعر بتمدد الصدر ثم اجمعهما كأنك تحضن.'],
  ['Incline_Dumbbell_Flyes', 'chest', 'تفتيح مائل بالدمبل', 'Same movement as flyes but on an incline bench, to focus on the upper chest.', 'نفس حركة التفتيح لكن على بنش مائل للتركيز على أعلى الصدر.'],
  ['Cable_Crossover', 'chest', 'كروس أوفر بالكابل', 'Stand between two high pulleys, pull the handles down and together in front of your hips, then return slowly.', 'قف بين بكرتين عاليتين، اسحب المقبضين للأسفل حتى يلتقيا أمام الحوض ثم ارجع ببطء.'],
  ['Low_Cable_Crossover', 'chest', 'كروس أوفر من الأسفل', 'Pull the handles from the low pulleys up and together at chest height.', 'اسحب المقبضين من البكرات السفلية للأعلى حتى يلتقيا أمام الصدر.'],
  ['Butterfly', 'chest', 'آلة الفراشة (Pec Deck)', 'Sit tall on the machine, bring the handles together in front of your chest, then open slowly.', 'اجلس مستقيماً على الآلة واجمع المقبضين أمام صدرك ثم افتح ببطء.'],
  ['Leverage_Chest_Press', 'chest', 'آلة ضغط الصدر', 'Sit with the handles at chest height and push them forward until your arms are straight.', 'اجلس والمقابض بمستوى الصدر وادفعها للأمام حتى تستقيم ذراعاك.'],
  ['Smith_Machine_Incline_Bench_Press', 'chest', 'ضغط مائل على السميث', 'On an incline bench under the Smith machine, lower the bar to your upper chest and press up.', 'على بنش مائل تحت آلة السميث، أنزل البار إلى أعلى الصدر ثم ادفع.'],
  ['Pushups', 'chest', 'تمرين الضغط (Pompes)', 'Hands under shoulders, body in a straight line. Lower your chest toward the floor and push back up.', 'اليدان تحت الكتفين والجسم مستقيم. أنزل صدرك نحو الأرض ثم ادفع للأعلى.'],
  ['Straight-Arm_Dumbbell_Pullover', 'chest', 'بول أوفر بالدمبل', 'Lying on a bench, lower one dumbbell behind your head with almost straight arms, then pull it back over your chest.', 'مستلقياً على البنش، أنزل دمبل واحد خلف رأسك بذراعين شبه مستقيمتين ثم أعده فوق صدرك.'],

  // ── Back ───────────────────────────────────────────────────────────────────
  ['Pullups', 'back', 'العقلة (Traction)', 'Hang from a bar with palms facing away and pull yourself up until your chin passes the bar.', 'تعلّق بالبار وراحتا اليدين للأمام، واسحب جسمك حتى يتجاوز ذقنك البار.'],
  ['Chin-Up', 'back', 'العقلة بقبضة عكسية', 'Palms facing you, pull your chin over the bar, then lower yourself slowly.', 'راحتا اليدين نحوك، اسحب ذقنك فوق البار ثم انزل ببطء.'],
  ['Wide-Grip_Lat_Pulldown', 'back', 'سحب أمامي واسع', 'Seated at the machine, pull the wide bar down to your upper chest while squeezing your shoulder blades down.', 'جالساً على الآلة، اسحب البار العريض إلى أعلى الصدر مع ضمّ لوحي الكتف للأسفل.'],
  ['Close-Grip_Front_Lat_Pulldown', 'back', 'سحب أمامي بقبضة ضيقة', 'Hold the bar with a narrow grip and pull it to your upper chest, leaning back slightly.', 'امسك البار بقبضة ضيقة واسحبه إلى أعلى الصدر مع ميلان خفيف للخلف.'],
  ['V-Bar_Pulldown', 'back', 'سحب بالمقبض V', 'Using the V handle, pull down to your chest keeping elbows close to your body.', 'بالمقبض V، اسحب نحو صدرك مع إبقاء المرفقين قريبين من الجسم.'],
  ['Seated_Cable_Rows', 'back', 'تجديف جالس بالكابل', 'Sit with knees slightly bent. Pull the handle to your stomach with a straight back, then extend your arms.', 'اجلس والركبتان مثنيتان قليلاً. اسحب المقبض نحو بطنك والظهر مستقيم ثم مدّ ذراعيك.'],
  ['Bent_Over_Barbell_Row', 'back', 'تجديف بالبار منحنياً', 'Hinge forward with a flat back, pull the bar to your lower ribs, then lower it.', 'انحنِ للأمام والظهر مستقيم، اسحب البار نحو أسفل الأضلاع ثم أنزله.'],
  ['One-Arm_Dumbbell_Row', 'back', 'تجديف بالدمبل بيد واحدة', 'One knee and hand on a bench, pull the dumbbell up to your hip, then lower it.', 'ركبة ويد على البنش، اسحب الدمبل نحو الورك ثم أنزله.'],
  ['Bent_Over_Two-Dumbbell_Row', 'back', 'تجديف بالدمبلين منحنياً', 'Bent forward with a flat back, row both dumbbells to your sides.', 'منحنياً والظهر مستقيم، اسحب الدمبلين نحو جانبي جسمك.'],
  ['T-Bar_Row_with_Handle', 'back', 'تجديف T-Bar', 'Straddle the bar, bend forward with a flat back and row the handle to your chest.', 'قف فوق البار، انحنِ والظهر مستقيم واسحب المقبض نحو صدرك.'],
  ['Leverage_High_Row', 'back', 'آلة التجديف العالي', 'Seated at the machine, pull the handles down and back, squeezing your shoulder blades.', 'جالساً على الآلة، اسحب المقابض للأسفل والخلف مع ضمّ لوحي الكتف.'],
  ['Straight-Arm_Pulldown', 'back', 'سحب بذراعين مستقيمتين', 'Standing at a high pulley, push the bar down to your thighs with straight arms.', 'واقفاً أمام بكرة عالية، ادفع البار نحو فخذيك بذراعين مستقيمتين.'],
  ['Inverted_Row', 'back', 'تجديف معكوس', 'Hang under a bar set at waist height, body straight, and pull your chest up to the bar.', 'تعلّق تحت بار بمستوى الخصر والجسم مستقيم، واسحب صدرك نحو البار.'],
  ['Barbell_Deadlift', 'back', 'الرفعة الميتة (Deadlift)', 'Bar over mid-foot, grip it, keep your back flat and stand up by pushing through your legs. Lower with control.', 'البار فوق منتصف القدم، امسكه والظهر مستقيم وقف بدفع الأرجل. أنزله بتحكّم.'],
  ['Rack_Pulls', 'back', 'رفعة من الحامل (Rack Pull)', 'A deadlift starting from pins at knee height — lock out your hips and lower back to the pins.', 'رفعة ميتة تبدأ من الحامل بمستوى الركبة — قف مستقيماً ثم أعد البار للحامل.'],
  ['Hyperextensions_Back_Extensions', 'back', 'تمديد أسفل الظهر (Lombaires)', 'On the hyperextension bench, lower your torso, then raise it until your body is straight.', 'على بنش التمديد، أنزل جذعك ثم ارفعه حتى يستقيم جسمك.'],

  // ── Shoulders ─────────────────────────────────────────────────────────────
  ['Standing_Military_Press', 'shoulders', 'ضغط عسكري واقفاً', 'Standing, press the bar from your collarbone straight overhead, then lower it.', 'واقفاً، ادفع البار من مستوى الترقوة إلى فوق الرأس ثم أنزله.'],
  ['Seated_Barbell_Military_Press', 'shoulders', 'ضغط عسكري جالساً', 'Seated with back support, press the bar from your upper chest overhead.', 'جالساً مع سند للظهر، ادفع البار من أعلى الصدر إلى فوق الرأس.'],
  ['Seated_Dumbbell_Press', 'shoulders', 'ضغط الكتف بالدمبل جالساً', 'Seated, press the dumbbells from shoulder height overhead, then lower.', 'جالساً، ادفع الدمبل من مستوى الكتفين إلى فوق الرأس ثم أنزلها.'],
  ['Arnold_Dumbbell_Press', 'shoulders', 'ضغط أرنولد', 'Start with palms facing you, rotate them outward as you press the dumbbells overhead.', 'ابدأ وراحتا اليدين نحوك، ثم أدرهما للخارج أثناء دفع الدمبل للأعلى.'],
  ['Machine_Shoulder_Military_Press', 'shoulders', 'آلة ضغط الكتف', 'Sit at the machine and press the handles overhead, then lower slowly.', 'اجلس على الآلة وادفع المقابض فوق رأسك ثم أنزلها ببطء.'],
  ['Smith_Machine_Overhead_Shoulder_Press', 'shoulders', 'ضغط الكتف على السميث', 'Seated under the Smith bar, press it overhead and lower it to chin level.', 'جالساً تحت بار السميث، ادفعه فوق رأسك ثم أنزله لمستوى الذقن.'],
  ['Side_Lateral_Raise', 'shoulders', 'رفع جانبي بالدمبل', 'Raise the dumbbells out to the sides up to shoulder height, elbows slightly bent, then lower.', 'ارفع الدمبل جانباً حتى مستوى الكتفين والمرفقان مثنيان قليلاً ثم أنزلها.'],
  ['Cable_Seated_Lateral_Raise', 'shoulders', 'رفع جانبي بالكابل', 'With a low pulley at your side, raise the handle out to shoulder height.', 'مع بكرة منخفضة بجانبك، ارفع المقبض جانباً حتى مستوى الكتف.'],
  ['Front_Dumbbell_Raise', 'shoulders', 'رفع أمامي بالدمبل', 'Raise the dumbbells in front of you to eye level with straight arms, then lower.', 'ارفع الدمبل أمامك حتى مستوى العين بذراعين مستقيمتين ثم أنزلها.'],
  ['Reverse_Flyes', 'shoulders', 'تفتيح خلفي بالدمبل', 'Bent forward, raise the dumbbells out to the sides to work the rear shoulders.', 'منحنياً للأمام، ارفع الدمبل جانباً لتشغيل الكتف الخلفي.'],
  ['Reverse_Machine_Flyes', 'shoulders', 'آلة الكتف الخلفي', 'Facing the pec-deck machine, pull the handles back and apart with straight arms.', 'مواجهاً آلة الفراشة، اسحب المقابض للخلف والجانبين بذراعين مستقيمتين.'],
  ['Face_Pull', 'shoulders', 'فيس بول', 'Pull a rope from a high pulley toward your face, elbows high, hands ending beside your ears.', 'اسحب الحبل من بكرة عالية نحو وجهك والمرفقان مرتفعان، واليدان بجانب الأذنين.'],
  ['Upright_Barbell_Row', 'shoulders', 'سحب عمودي بالبار', 'Pull the bar up along your body to chest height, elbows leading, then lower.', 'اسحب البار للأعلى بمحاذاة جسمك حتى الصدر والمرفقان يقودان الحركة ثم أنزله.'],

  // ── Biceps ────────────────────────────────────────────────────────────────
  ['Barbell_Curl', 'biceps', 'كيرل بالبار', 'Standing, curl the bar up to your shoulders keeping elbows by your sides, then lower slowly.', 'واقفاً، اثنِ البار نحو كتفيك والمرفقان ثابتان بجانبك ثم أنزله ببطء.'],
  ['EZ-Bar_Curl', 'biceps', 'كيرل بالبار المتعرج (EZ)', 'Same as a barbell curl but with the angled EZ bar, easier on the wrists.', 'مثل كيرل البار لكن بالبار المتعرّج، أريح للرسغين.'],
  ['Dumbbell_Bicep_Curl', 'biceps', 'كيرل بالدمبل', 'Curl both dumbbells up, turning palms toward you, then lower with control.', 'اثنِ الدمبلين للأعلى وراحتا اليدين نحوك ثم أنزلهما بتحكّم.'],
  ['Dumbbell_Alternate_Bicep_Curl', 'biceps', 'كيرل بالتناوب', 'Curl one dumbbell at a time, alternating arms.', 'اثنِ دمبل واحد في كل مرة بالتناوب بين الذراعين.'],
  ['Hammer_Curls', 'biceps', 'كيرل المطرقة (Hammer)', 'Palms facing each other, curl the dumbbells up like holding hammers.', 'راحتا اليدين متقابلتان، اثنِ الدمبل للأعلى كأنك تمسك مطرقة.'],
  ['Incline_Dumbbell_Curl', 'biceps', 'كيرل مائل بالدمبل', 'Sitting back on an incline bench with arms hanging, curl the dumbbells up.', 'جالساً على بنش مائل والذراعان متدليتان، اثنِ الدمبل للأعلى.'],
  ['Concentration_Curls', 'biceps', 'كيرل التركيز', 'Seated, elbow braced on your inner thigh, curl one dumbbell up slowly.', 'جالساً والمرفق مستند على داخل الفخذ، اثنِ الدمبل ببطء.'],
  ['Preacher_Curl', 'biceps', 'كيرل على مسند (Preacher)', 'Arms resting on the preacher pad, curl the bar up and lower it all the way.', 'الذراعان على المسند، اثنِ البار للأعلى ثم أنزله بالكامل.'],
  ['Machine_Preacher_Curls', 'biceps', 'آلة كيرل المسند', 'Seated at the machine with arms on the pad, curl the handles up.', 'جالساً على الآلة والذراعان على المسند، اثنِ المقابض للأعلى.'],
  ['Standing_Biceps_Cable_Curl', 'biceps', 'كيرل بالكابل', 'Facing a low pulley, curl the bar up to your chest, elbows fixed.', 'مواجهاً بكرة منخفضة، اثنِ البار نحو صدرك والمرفقان ثابتان.'],
  ['Cable_Hammer_Curls_-_Rope_Attachment', 'biceps', 'كيرل مطرقة بالحبل', 'Using a rope on a low pulley, curl with palms facing each other.', 'بحبل على بكرة منخفضة، اثنِ وراحتا اليدين متقابلتان.'],
  ['Spider_Curl', 'biceps', 'سبايدر كيرل', 'Lie chest-down on an incline bench, arms hanging straight, and curl the bar up.', 'استلقِ على بطنك فوق بنش مائل والذراعان متدليتان، واثنِ البار للأعلى.'],

  // ── Triceps ───────────────────────────────────────────────────────────────
  ['Triceps_Pushdown', 'triceps', 'دفع الترايسبس بالكابل', 'At a high pulley, push the bar down until your arms are straight, elbows pinned to your sides.', 'أمام بكرة عالية، ادفع البار للأسفل حتى تستقيم الذراعان والمرفقان ملتصقان بالجسم.'],
  ['Triceps_Pushdown_-_Rope_Attachment', 'triceps', 'دفع الترايسبس بالحبل', 'Push the rope down and spread the ends apart at the bottom.', 'ادفع الحبل للأسفل وافتح طرفيه في النهاية.'],
  ['Reverse_Grip_Triceps_Pushdown', 'triceps', 'دفع ترايسبس بقبضة عكسية', 'With palms facing up, push the bar down until your arms are straight.', 'وراحتا اليدين للأعلى، ادفع البار للأسفل حتى تستقيم الذراعان.'],
  ['Triceps_Overhead_Extension_with_Rope', 'triceps', 'تمديد فوق الرأس بالحبل', 'Facing away from the pulley, extend the rope forward and overhead from behind your head.', 'ظهرك للبكرة، مدّ الحبل من خلف رأسك إلى الأمام وفوق الرأس.'],
  ['EZ-Bar_Skullcrusher', 'triceps', 'سكل كراشر (Barre au front)', 'Lying on a bench, lower the EZ bar toward your forehead by bending the elbows, then extend.', 'مستلقياً على البنش، أنزل البار نحو جبهتك بثني المرفقين ثم مدّهما.'],
  ['Close-Grip_Barbell_Bench_Press', 'triceps', 'ضغط بنش بقبضة ضيقة', 'Bench press with hands shoulder-width apart, elbows close to your body.', 'ضغط بنش واليدان بعرض الكتفين والمرفقان قريبان من الجسم.'],
  ['Dips_-_Triceps_Version', 'triceps', 'الغطس (Dips)', 'On parallel bars with your body upright, bend the elbows to lower, then push back up.', 'على المتوازي والجسم مستقيم، اثنِ المرفقين لتنزل ثم ادفع للأعلى.'],
  ['Bench_Dips', 'triceps', 'غطس على البنش', 'Hands on a bench behind you, lower your hips by bending the elbows, then push up.', 'اليدان على بنش خلفك، أنزل حوضك بثني المرفقين ثم ادفع للأعلى.'],
  ['Standing_Dumbbell_Triceps_Extension', 'triceps', 'تمديد الترايسبس بالدمبل فوق الرأس', 'Hold one dumbbell overhead with both hands, lower it behind your head, then extend.', 'امسك دمبل بكلتا اليدين فوق رأسك، أنزله خلف الرأس ثم مدّ ذراعيك.'],
  ['Tricep_Dumbbell_Kickback', 'triceps', 'كيك باك بالدمبل', 'Bent forward with the upper arm parallel to the floor, straighten your elbow backward.', 'منحنياً والعضد موازٍ للأرض، مدّ المرفق للخلف حتى تستقيم الذراع.'],
  ['Machine_Triceps_Extension', 'triceps', 'آلة الترايسبس', 'Seated at the machine, extend your arms down or forward against the pads.', 'جالساً على الآلة، مدّ ذراعيك ضد المقابض.'],
  ['Dip_Machine', 'triceps', 'آلة الغطس', 'Seated at the dip machine, push the handles down until your arms are straight.', 'جالساً على آلة الغطس، ادفع المقابض للأسفل حتى تستقيم الذراعان.'],

  // ── Forearms ──────────────────────────────────────────────────────────────
  ['Palms-Up_Barbell_Wrist_Curl_Over_A_Bench', 'forearms', 'ثني الرسغ بالبار', 'Forearms on a bench, palms up, curl the bar up using only your wrists.', 'الساعدان على البنش وراحتا اليدين للأعلى، ارفع البار بالرسغين فقط.'],
  ['Palms-Down_Wrist_Curl_Over_A_Bench', 'forearms', 'ثني الرسغ العكسي', 'Forearms on a bench, palms down, lift the bar with your wrists.', 'الساعدان على البنش وراحتا اليدين للأسفل، ارفع البار بالرسغين.'],
  ['Seated_Dumbbell_Palms-Up_Wrist_Curl', 'forearms', 'ثني الرسغ بالدمبل', 'Seated, forearms on your thighs, curl the dumbbells up with your wrists.', 'جالساً والساعدان على الفخذين، ارفع الدمبل بالرسغين.'],
  ['Reverse_Barbell_Curl', 'forearms', 'كيرل عكسي بالبار', 'Curl the bar with palms facing down to work the forearms.', 'اثنِ البار وراحتا اليدين للأسفل لتشغيل الساعد.'],
  ['Farmers_Walk', 'forearms', 'مشية المزارع', 'Hold heavy dumbbells at your sides and walk with an upright posture.', 'امسك دمبل ثقيلين بجانبك وامشِ والجسم مستقيم.'],

  // ── Quadriceps ────────────────────────────────────────────────────────────
  ['Barbell_Squat', 'quadriceps', 'السكوات بالبار', 'Bar on your upper back, sit your hips back and down until thighs are parallel, then stand up.', 'البار على أعلى الظهر، انزل بالحوض للخلف حتى يوازي الفخذان الأرض ثم قف.'],
  ['Barbell_Full_Squat', 'quadriceps', 'سكوات كامل بالبار', 'A deep squat going below parallel while keeping your chest up.', 'سكوات عميق تحت مستوى التوازي مع إبقاء الصدر مرفوعاً.'],
  ['Front_Barbell_Squat', 'quadriceps', 'سكوات أمامي', 'Bar resting on the front of your shoulders, squat down keeping your torso upright.', 'البار على مقدّمة الكتفين، انزل والجذع مستقيم.'],
  ['Leg_Press', 'quadriceps', 'آلة دفع الأرجل (Presse)', 'Feet on the platform, lower it until your knees reach about 90°, then push it away.', 'القدمان على المنصة، أنزلها حتى تنثني الركبتان ٩٠° تقريباً ثم ادفعها.'],
  ['Hack_Squat', 'quadriceps', 'هاك سكوات', 'On the hack squat machine, squat down with your back on the pad, then drive up.', 'على آلة الهاك، انزل والظهر ملتصق بالمسند ثم ادفع للأعلى.'],
  ['Leg_Extensions', 'quadriceps', 'تمديد الأرجل (Leg Extension)', 'Seated at the machine, straighten your legs to lift the pad, then lower slowly.', 'جالساً على الآلة، مدّ رجليك لرفع المسند ثم أنزله ببطء.'],
  ['Smith_Machine_Squat', 'quadriceps', 'سكوات على السميث', 'Squat under the Smith bar with feet slightly in front of you.', 'انزل تحت بار السميث والقدمان أمامك قليلاً.'],
  ['Goblet_Squat', 'quadriceps', 'سكوات الكأس (Goblet)', 'Hold a dumbbell or kettlebell at your chest and squat down between your knees.', 'امسك دمبل أو كيتلبل أمام صدرك وانزل بين ركبتيك.'],
  ['Bodyweight_Squat', 'quadriceps', 'سكوات بوزن الجسم', 'Arms forward, sit down as if onto a chair, then stand back up.', 'الذراعان للأمام، انزل كأنك تجلس على كرسي ثم قف.'],
  ['Dumbbell_Lunges', 'quadriceps', 'الطعن بالدمبل (Fentes)', 'Step forward and lower until both knees are at 90°, then push back to standing.', 'اخطُ للأمام وانزل حتى تنثني الركبتان ٩٠° ثم ارجع للوقوف.'],
  ['Barbell_Walking_Lunge', 'quadriceps', 'طعن مشي بالبار', 'With a bar on your back, lunge forward step after step.', 'والبار على ظهرك، تقدّم بخطوات طعن متتالية.'],
  ['Split_Squat_with_Dumbbells', 'quadriceps', 'سبليت سكوات بالدمبل', 'One foot forward, one back, lower straight down and stand up. Do both sides.', 'قدم للأمام وأخرى للخلف، انزل عمودياً ثم قف. كرّر للجهتين.'],
  ['Dumbbell_Step_Ups', 'quadriceps', 'الصعود على صندوق بالدمبل', 'Step up onto a box or bench with one leg, stand tall, then step down.', 'اصعد على صندوق أو بنش برجل واحدة، قف مستقيماً ثم انزل.'],

  // ── Hamstrings ────────────────────────────────────────────────────────────
  ['Romanian_Deadlift', 'hamstrings', 'الرفعة الرومانية', 'With soft knees, push your hips back and slide the bar down your thighs until you feel a hamstring stretch, then stand up.', 'والركبتان مثنيتان قليلاً، ادفع حوضك للخلف وأنزل البار على فخذيك حتى تشعر بتمدد الخلفية ثم قف.'],
  ['Stiff-Legged_Barbell_Deadlift', 'hamstrings', 'رفعة بأرجل مستقيمة بالبار', 'Legs almost straight, bend at the hips lowering the bar, then return upright.', 'الرجلان شبه مستقيمتين، انحنِ من الحوض لإنزال البار ثم ارجع مستقيماً.'],
  ['Stiff-Legged_Dumbbell_Deadlift', 'hamstrings', 'رفعة بأرجل مستقيمة بالدمبل', 'Same hip hinge with dumbbells in front of your legs.', 'نفس حركة الانحناء من الحوض بالدمبل أمام الرجلين.'],
  ['Lying_Leg_Curls', 'hamstrings', 'ثني الأرجل مستلقياً', 'Lying face down on the machine, curl your heels toward your glutes.', 'مستلقياً على بطنك فوق الآلة، اثنِ كعبيك نحو المؤخرة.'],
  ['Seated_Leg_Curl', 'hamstrings', 'ثني الأرجل جالساً', 'Seated at the machine, press the pad down and back with your heels.', 'جالساً على الآلة، اضغط المسند للأسفل والخلف بكعبيك.'],
  ['Standing_Leg_Curl', 'hamstrings', 'ثني الرجل واقفاً', 'Standing at the machine, curl one heel up toward your glutes.', 'واقفاً أمام الآلة، اثنِ كعب رجل واحدة نحو المؤخرة.'],
  ['Good_Morning', 'hamstrings', 'غود مورنينغ', 'Bar on your back, bow forward at the hips with a flat back, then rise.', 'البار على ظهرك، انحنِ للأمام من الحوض والظهر مستقيم ثم ارتفع.'],
  ['Glute_Ham_Raise', 'hamstrings', 'رفع الألوية والخلفية (GHR)', 'Knees on the pad and feet locked, lower your body forward and pull yourself back up with your hamstrings.', 'الركبتان على المسند والقدمان مثبتتان، أنزل جسمك للأمام ثم اسحبه للأعلى بعضلات الخلفية.'],
  ['Sumo_Deadlift', 'hamstrings', 'رفعة سومو', 'Wide stance with hands inside your knees, stand up with the bar keeping your chest up.', 'وقفة عريضة واليدان داخل الركبتين، قف بالبار مع إبقاء الصدر مرفوعاً.'],

  // ── Glutes ────────────────────────────────────────────────────────────────
  ['Barbell_Hip_Thrust', 'glutes', 'دفع الحوض بالبار (Hip Thrust)', 'Upper back on a bench, bar over your hips; drive your hips up until your body is flat, squeeze, lower.', 'أعلى الظهر على البنش والبار فوق الحوض؛ ادفع حوضك للأعلى حتى يستقيم جسمك، اضغط الألوية ثم انزل.'],
  ['Barbell_Glute_Bridge', 'glutes', 'جسر الألوية بالبار', 'Lying on the floor with a bar on your hips, lift your hips and squeeze your glutes.', 'مستلقياً على الأرض والبار فوق حوضك، ارفع الحوض واضغط الألوية.'],
  ['Butt_Lift_Bridge', 'glutes', 'جسر الألوية', 'Lying on your back with knees bent, lift your hips up and squeeze, then lower.', 'مستلقياً والركبتان مثنيتان، ارفع حوضك واضغط ثم انزل.'],
  ['Single_Leg_Glute_Bridge', 'glutes', 'جسر الألوية برجل واحدة', 'Same bridge with one leg raised, pushing through the planted heel.', 'نفس الجسر مع رفع رجل واحدة والدفع بكعب الرجل الأخرى.'],
  ['One-Legged_Cable_Kickback', 'glutes', 'ركلة خلفية بالكابل', 'Ankle strap on a low pulley, kick your leg straight back and squeeze your glute.', 'حزام الكاحل على بكرة منخفضة، اركل رجلك للخلف واضغط الألوية.'],
  ['Glute_Kickback', 'glutes', 'ركلة خلفية على الأرض', 'On hands and knees, push one heel up toward the ceiling.', 'على اليدين والركبتين، ادفع كعباً واحداً نحو السقف.'],
  ['Pull_Through', 'glutes', 'سحب بين الأرجل بالكابل', 'Facing away from a low pulley, hinge forward then snap your hips through to stand tall.', 'ظهرك لبكرة منخفضة، انحنِ للأمام ثم ادفع حوضك للأمام لتقف مستقيماً.'],
  ['Thigh_Abductor', 'glutes', 'آلة إبعاد الفخذ (Abducteur)', 'Seated at the machine, push your knees outward against the pads, then return slowly.', 'جالساً على الآلة، ادفع ركبتيك للخارج ضد المساند ثم ارجع ببطء.'],

  // ── Calves ────────────────────────────────────────────────────────────────
  ['Standing_Calf_Raises', 'calves', 'رفع السمانة واقفاً', 'Shoulders under the pads, rise onto your toes as high as possible, then lower your heels.', 'الكتفان تحت المساند، ارتفع على أصابع قدميك لأقصى حد ثم أنزل الكعبين.'],
  ['Seated_Calf_Raise', 'calves', 'رفع السمانة جالساً', 'Seated with the pad on your knees, raise your heels, then lower them fully.', 'جالساً والمسند على ركبتيك، ارفع كعبيك ثم أنزلهما بالكامل.'],
  ['Calf_Press_On_The_Leg_Press_Machine', 'calves', 'رفع السمانة على آلة الدفع', 'On the leg press, push the platform using only your toes.', 'على آلة دفع الأرجل، ادفع المنصة بأصابع القدمين فقط.'],
  ['Smith_Machine_Calf_Raise', 'calves', 'رفع السمانة على السميث', 'Under the Smith bar, stand on a step and raise your heels.', 'تحت بار السميث، قف على درجة وارفع كعبيك.'],
  ['Standing_Dumbbell_Calf_Raise', 'calves', 'رفع السمانة بالدمبل', 'Holding dumbbells, rise onto your toes and lower slowly.', 'ممسكاً الدمبل، ارتفع على أصابعك ثم انزل ببطء.'],

  // ── Abs ───────────────────────────────────────────────────────────────────
  ['Crunches', 'abs', 'الكرانش', 'Lying with knees bent, curl your shoulders off the floor toward your knees, then lower.', 'مستلقياً والركبتان مثنيتان، ارفع كتفيك عن الأرض نحو الركبتين ثم انزل.'],
  ['Plank', 'abs', 'البلانك (Gainage)', 'Hold a straight line on your forearms and toes, tightening your stomach.', 'اثبت على ساعديك وأصابع قدميك والجسم مستقيم مع شدّ البطن.'],
  ['Side_Bridge', 'abs', 'بلانك جانبي', 'On one forearm and the side of your foot, hold your body in a straight line.', 'على ساعد واحد وجانب القدم، اثبت والجسم مستقيم.'],
  ['Hanging_Leg_Raise', 'abs', 'رفع الأرجل معلّقاً', 'Hanging from a bar, raise your legs up in front of you, then lower slowly.', 'متعلّقاً بالبار، ارفع رجليك أمامك ثم أنزلهما ببطء.'],
  ['Flat_Bench_Lying_Leg_Raise', 'abs', 'رفع الأرجل مستلقياً', 'Lying on a bench, raise your straight legs to vertical, then lower without touching down.', 'مستلقياً على البنش، ارفع رجليك المستقيمتين حتى العمودي ثم أنزلهما دون لمس.'],
  ['Reverse_Crunch', 'abs', 'كرانش عكسي', 'Lying down, bring your knees toward your chest lifting your hips off the floor.', 'مستلقياً، اجلب ركبتيك نحو صدرك مع رفع الحوض عن الأرض.'],
  ['Cable_Crunch', 'abs', 'كرانش بالكابل راكعاً', 'Kneeling at a high pulley holding a rope, crunch down bringing your elbows to your thighs.', 'راكعاً أمام بكرة عالية ممسكاً الحبل، انحنِ بالبطن حتى يقترب المرفقان من الفخذين.'],
  ['Ab_Crunch_Machine', 'abs', 'آلة البطن', 'Seated at the machine, crunch forward against the resistance, then return slowly.', 'جالساً على الآلة، انحنِ للأمام ضد المقاومة ثم ارجع ببطء.'],
  ['Russian_Twist', 'abs', 'الالتواء الروسي', 'Seated leaning back with feet up, rotate your torso side to side.', 'جالساً مائلاً للخلف والقدمان مرفوعتان، أدر جذعك يميناً ويساراً.'],
  ['Air_Bike', 'abs', 'كرانش الدراجة', 'Lying down, bring opposite elbow to knee alternately in a pedalling motion.', 'مستلقياً، قرّب المرفق من الركبة المعاكسة بالتناوب كأنك تدوّس دراجة.'],
  ['Sit-Up', 'abs', 'الجلوس من الاستلقاء (Sit-up)', 'Feet anchored and knees bent, sit all the way up, then lower back down.', 'القدمان مثبتتان والركبتان مثنيتان، اجلس بالكامل ثم عُد للاستلقاء.'],
  ['Oblique_Crunches', 'abs', 'كرانش جانبي', 'Lying on your side, crunch your upper body toward your hip to work the obliques.', 'مستلقياً على جنبك، ارفع جذعك نحو الورك لتشغيل الجوانب.'],
  ['Barbell_Ab_Rollout_-_On_Knees', 'abs', 'دحرجة البطن (Ab wheel)', 'On your knees, roll the bar or wheel forward as far as you can control, then pull back.', 'على ركبتيك، دحرج البار أو العجلة للأمام قدر ما تتحكّم ثم اسحب للخلف.'],
  ['Dead_Bug', 'abs', 'ديد باغ', 'Lying on your back, arms and legs up, lower the opposite arm and leg while keeping your back flat.', 'مستلقياً والذراعان والرجلان للأعلى، أنزل الذراع والرجل المعاكسة مع إبقاء الظهر ملتصقاً.'],

  // ── Adductors ─────────────────────────────────────────────────────────────
  ['Thigh_Adductor', 'adductors', 'آلة ضمّ الفخذ (Adducteur)', 'Seated at the machine, squeeze your knees together against the pads, then open slowly.', 'جالساً على الآلة، اضغط ركبتيك نحو بعض ضد المساند ثم افتح ببطء.'],
  ['Cable_Hip_Adduction', 'adductors', 'ضمّ الفخذ بالكابل', 'Ankle strap on a low pulley, pull your leg across in front of the other.', 'حزام الكاحل على بكرة منخفضة، اسحب رجلك أمام الأخرى نحو الداخل.'],
  ['Plie_Dumbbell_Squat', 'adductors', 'سكوات بليه بالدمبل', 'Very wide stance with toes out, hold a dumbbell between your legs and squat down.', 'وقفة عريضة جداً والأصابع للخارج، امسك دمبل بين رجليك وانزل.'],
  ['Wide_Stance_Barbell_Squat', 'adductors', 'سكوات بوقفة عريضة (سومو)', 'Squat with feet wider than shoulders and knees pushed out.', 'سكوات والقدمان أعرض من الكتفين والركبتان مدفوعتان للخارج.'],

  // ── Traps ─────────────────────────────────────────────────────────────────
  ['Barbell_Shrug', 'traps', 'رفع الأكتاف بالبار (Shrug)', 'Holding the bar at arm’s length, lift your shoulders toward your ears, pause, lower.', 'ممسكاً البار والذراعان ممدودتان، ارفع كتفيك نحو أذنيك، توقّف ثم أنزلهما.'],
  ['Dumbbell_Shrug', 'traps', 'رفع الأكتاف بالدمبل', 'Dumbbells at your sides, shrug your shoulders straight up, then lower.', 'الدمبل بجانبك، ارفع كتفيك للأعلى مباشرة ثم أنزلهما.'],
  ['Cable_Shrugs', 'traps', 'رفع الأكتاف بالكابل', 'Holding a bar on a low pulley, shrug your shoulders up and hold briefly.', 'ممسكاً البار على بكرة منخفضة، ارفع كتفيك واثبت لحظة.'],
  ['Leverage_Shrug', 'traps', 'آلة رفع الأكتاف', 'Using the shrug machine handles, lift your shoulders up and lower slowly.', 'بمقابض آلة رفع الأكتاف، ارفع كتفيك ثم أنزلهما ببطء.'],
  ['Standing_Dumbbell_Upright_Row', 'traps', 'سحب عمودي بالدمبل', 'Pull the dumbbells up along your body to chest height, elbows high.', 'اسحب الدمبل للأعلى بمحاذاة جسمك حتى الصدر والمرفقان مرتفعان.'],
];
