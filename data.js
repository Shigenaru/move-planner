// Step library for a move inside Tokyo (Minato-ku -> Shibuya-ku).
// Due dates are relative to anchors: start (plan created), keys (new lease start),
// move (moving day), oldEnd (old lease end). office: shift to an open ward-office day.
(function () {
  const G = (q) => 'https://www.google.com/search?q=' + encodeURIComponent(q);

  // Questions that switch conditional steps on/off.
  const PROFILE = [
    { key: 'myna', q: 'Do you both have a My Number card (マイナンバーカード)?', def: true },
    { key: 'license', q: 'Does either of you have a Japanese driver’s license?', def: true },
    { key: 'carOwner', q: 'Do you own a car (needs parking certificate / 車庫証明)?', def: false },
    { key: 'foreign', q: 'Is either of you a foreign resident with a Residence Card (在留カード)?', def: false },
    { key: 'nhi', q: 'Is either of you on National Health Insurance (国民健康保険) rather than company insurance?', def: false },
    { key: 'appliances', q: 'Will you get rid of a TV, fridge, washing machine or air conditioner?', def: false },
    { key: 'inkan', q: 'Do you have a registered seal (印鑑登録 / 実印)?', def: false },
    { key: 'pet', q: 'Do you have a dog?', def: false },
    { key: 'nhk', q: 'Do you have an NHK contract?', def: true },
  ];

  const STEPS = [
    // ---------- BOOK ----------
    {
      id: 'notice-old', phase: 'book', title: 'Give notice on your current apartment', ja: '解約通知（退去連絡）',
      def: true, due: { a: 'start', o: 2 }, assign: 'both',
      deadline: 'Notice period in your contract (often 1 month, sometimes 2)',
      why: 'Japanese leases usually renew automatically (自動更新). If you do not send formal notice, you may be charged a renewal fee (更新料) or extra rent past Jan 25.',
      how: [
        'Find the 解約予告 clause in your lease (e.g. 「1ヶ月前までに通知」).',
        'Contact the management company (管理会社) and ask for the cancellation form (解約通知書). Many accept online/fax forms.',
        'Choose your move-out date (退去日). You can move out earlier than Jan 25; rent is often charged daily (日割り) or by half-month — ask.',
        'Ask how the move-out inspection (退去立会い) is booked and how the deposit (敷金) is returned.',
      ],
      bring: ['Lease contract (賃貸借契約書)', 'Contract number / room number'],
      where: 'Current management company or landlord',
      tip: 'Get written/email confirmation of the date they received your notice.',
    },
    {
      id: 'mover-quotes', phase: 'book', title: 'Get quotes from moving companies', ja: '引越し業者の相見積もり',
      def: true, due: { a: 'start', o: 5 }, assign: 'both', note: 'quotes',
      why: 'The last week of December is peak season (繁忙期). Popular slots go early and prices rise. Comparing 2–3 quotes (相見積もり) usually lowers the price a lot.',
      how: [
        'Use a comparison site (引越し侍, SUUMO引越し見積もり) or contact companies directly (アート, サカイ, 日通, アリさん…).',
        'Minato → Shibuya is a short move. Ask for a 2-person plan and say what large furniture you have.',
        'Online or video quotes (オンライン見積もり) are fine for small moves. Visits (訪問見積もり) are more accurate.',
        'Compare: price, date and time slot (午前便 is pricier; フリー便 is cheaper but the time is not fixed), free boxes, insurance, and whether they take away old furniture.',
      ],
      where: 'Online / phone',
      tip: 'Ask whether they are open 12/29–12/31 and whether the year-end surcharge applies.',
      links: [['引越し侍 (comparison)', G('引越し侍 見積もり')], ['SUUMO 引越し見積もり', G('SUUMO 引越し 見積もり')]],
    },
    {
      id: 'mover-book', phase: 'book', title: 'Book the moving company', ja: '引越し業者の予約',
      def: true, due: { a: 'start', o: 9 }, assign: 'both',
      why: 'Locks in your moving day. Without a mover, you cannot fix the rest of the schedule.',
      how: [
        'Confirm the date, time slot, both addresses, floor and elevator details, and whether a truck can park.',
        'Ask for boxes (段ボール), tape and hanger boxes to be delivered early.',
        'Check what they will NOT carry: cash, valuables, plants, gas canisters, sometimes aquariums.',
        'Save the confirmation number in Contacts.',
      ],
      where: 'Moving company',
      cost: 'Short move in Tokyo at year end: roughly ¥50,000–¥150,000 for 2 people (varies a lot)',
    },
    {
      id: 'internet-new', phase: 'book', title: 'Apply for internet at the new home', ja: '新居のインターネット申込・開通工事予約',
      def: true, due: { a: 'start', o: 3 }, assign: 'both',
      why: 'A fiber line (光回線) installation can take 2–6 weeks, and year-end slots fill quickly. Apply as soon as you have the new address.',
      how: [
        'Ask the agent or management which lines the building has (光配線, VDSL, LAN, or a building-provided free Wi-Fi).',
        'If you keep your current provider, ask about 移転 (transfer). It is often cheaper than a new contract and may avoid early-termination fees.',
        'Book the installation (開通工事) for a day during the overlap period. Someone may need to be home.',
        'Backup plan: a home router (ホームルーター) or pocket Wi-Fi until the line works.',
      ],
      where: 'Internet provider (NTT/au/NURO/ソフトバンク光 etc.)',
    },
    {
      id: 'new-lease', phase: 'book', title: 'Sign the new lease and pay the move-in costs', ja: '新居の契約・初期費用の支払い',
      def: true, due: { a: 'keys', o: -3 }, assign: 'both',
      why: 'The keys are handed over only after the contract is signed and the move-in costs (初期費用) are paid.',
      how: [
        'Sign the lease (賃貸借契約書) and the guarantor-company contract (保証会社) if there is one.',
        'Pay the move-in costs: 敷金 (deposit), 礼金 (key money), 仲介手数料 (agent fee), 前家賃 (first rent), 保証料, and the 鍵交換費 (lock change fee).',
        'Join the required fire insurance (火災保険). It is often arranged by the agent, but you can choose your own.',
        'Agree on when and where you will pick up the keys.',
      ],
      bring: ['Residence certificate (住民票) if requested', 'ID', 'Seal (印鑑)', 'Bank card'],
      where: 'Real estate agent (不動産会社)',
    },
    {
      id: 'keys', phase: 'book', title: 'Pick up the keys', ja: '鍵の受け取り',
      def: true, due: { a: 'keys', o: 0 }, assign: 'both',
      why: 'The new lease starts today. Once you have the keys, you can start setting up the new home.',
      how: [
        'Pick up the keys at the agent or management company (the time is usually set when you sign).',
        'Count the keys and write down how many you received. You must return all of them when you move out.',
        'Ask about the key for the mailbox, the auto-lock and the bike parking, and where the breaker and the water valve are.',
      ],
      bring: ['ID', 'Contract copy'],
      where: 'Real estate agent or management company',
    },
    {
      id: 'budget', phase: 'book', title: 'Set a moving budget', ja: '予算を決める',
      def: true, due: { a: 'start', o: 4 }, assign: 'both',
      why: 'Overlap rent (two rents for about 6 weeks), year-end moving prices and new furniture add up fast.',
      how: ['Open the Budget tab and fill in estimates.', 'Decide which costs you split 50/50 and which are personal.'],
      where: 'This app → Budget',
    },
    {
      id: 'dispose-plan', phase: 'book', title: 'Decide what to throw away, sell or give away', ja: '不用品の処分（粗大ごみ・売却）',
      def: true, due: { a: 'start', o: 10 }, assign: 'both', note: 'dispose',
      why: 'Oversized garbage (粗大ごみ) needs a reservation and fills up before year end. Selling takes time too, so start early.',
      how: [
        'List the items in the linked note.',
        'Minato-ku 粗大ごみ: reserve online or by phone, buy 粗大ごみ処理券 stickers at a convenience store, and put items out on the reserved morning.',
        'Sell or give away items on メルカリ, ジモティー or at a recycle shop (リサイクルショップ). Some movers also buy items.',
        'Note when year-end collections stop at the old address.',
      ],
      where: 'Minato-ku 粗大ごみ受付センター',
      links: [['港区 粗大ごみ申込', G('港区 粗大ごみ 申込')]],
    },
    {
      id: 'kaden', phase: 'book', title: 'Arrange appliance recycling', ja: '家電リサイクル（テレビ・冷蔵庫・洗濯機・エアコン）',
      cond: 'appliances', due: { a: 'move', o: -14 }, assign: 'both',
      why: 'TVs, fridges/freezers, washing machines/dryers and air conditioners cannot go out as 粗大ごみ. They must be recycled under the Home Appliance Recycling Law and a fee is charged.',
      how: [
        'Easiest: the store selling you the new appliance takes the old one (引き取り).',
        'Or ask your moving company, or use the 家電リサイクル受付センター.',
        'Pay the recycling fee (リサイクル料金) plus the collection fee.',
      ],
      links: [['家電リサイクル券センター', 'https://www.rkc.aeha.or.jp/']],
    },
    {
      id: 'timeoff', phase: 'book', title: 'Book time off work', ja: '有給休暇の申請',
      def: true, due: { a: 'start', o: 7 }, assign: 'both',
      why: 'You need daytime hours for moving day, the gas opening, internet installation, the city office and the move-out inspection.',
      how: ['Check which appointments need someone at home and split them between you.'],
    },
    {
      id: 'measure', phase: 'book', title: 'Measure the new home', ja: '新居の採寸',
      def: true, due: { a: 'keys', o: 0 }, assign: 'both', note: 'measure',
      why: 'Window sizes in Japan are not standard, so curtains must fit. Fridges and washing machines must fit their spaces and get through the doors.',
      how: [
        'Curtains: rail width × 1.05 (for slack) and hook-to-floor or hook-to-sill height minus about 1 cm.',
        'Washing machine area (防水パン) size and faucet height. Fridge space width, depth and height.',
        'Doors, hallway, elevator and entrance widths, for delivering beds and sofas.',
        'Ceiling light fittings (引掛シーリング): many apartments come with no lights. Check the AC units and the number and location of outlets.',
      ],
      tip: 'Take a video walk-through as well. Useful while shopping.',
    },

    // ---------- SETUP ----------
    {
      id: 'electric-new', phase: 'setup', title: 'Start electricity at the new home', ja: '新居の電気 使用開始',
      def: true, due: { a: 'keys', o: -5 }, assign: 'both',
      why: 'You need power during the overlap for lights, heating and charging. December is cold!',
      how: ['Apply online with TEPCO or your chosen provider, starting from the key date.', 'On the first day, switch on the breaker (ブレーカー). Some buildings need the 申込書 left at the breaker.'],
      links: [['TEPCO 引越し手続き', 'https://www.tepco.co.jp/ep/']],
    },
    {
      id: 'water-new', phase: 'setup', title: 'Start water at the new home', ja: '新居の水道 使用開始',
      def: true, due: { a: 'keys', o: -5 }, assign: 'both',
      why: 'Tokyo water is run by the Tokyo Metropolitan Waterworks Bureau (東京都水道局). You can do it online.',
      how: ['Apply online for 使用開始 with the address and start date.', 'Open the main water valve if it is closed.'],
      links: [['東京都水道局 引越し手続き', 'https://www.waterworks.metro.tokyo.lg.jp/']],
    },
    {
      id: 'gas-new', phase: 'setup', title: 'Book the gas opening (in person)', ja: 'ガス開栓の立会い予約',
      def: true, due: { a: 'keys', o: -7 }, assign: 'both',
      why: 'Unlike electricity and water, gas must be turned on by a technician with someone present (立会い, ~20–30 min). Without it there is no hot water or shower. Year-end slots go fast.',
      how: ['Book online with Tokyo Gas (or your provider). Pick a day early in the overlap.', 'Someone (adult) must be home. Have the gas stove/appliances ready if you want them checked.'],
      links: [['東京ガス 引越し（開栓）', 'https://www.tokyo-gas.co.jp/']],
    },
    {
      id: 'movein-check', phase: 'setup', title: 'Record the condition of the new home', ja: '入居時チェック（傷・汚れの記録）',
      def: true, due: { a: 'keys', o: 1 }, assign: 'both',
      why: 'Photos of existing scratches, stains and damage protect your deposit when you eventually move out.',
      how: ['Before bringing anything in, photograph and video every room, the floors, walls, fittings and appliances.', 'Fill in and return the move-in checklist (入居時チェックシート) if the management company provides one. Keep a copy.', 'Report anything broken (water leaks, AC, intercom) now.'],
    },
    {
      id: 'smoke-bug', phase: 'setup', title: 'Bug-smoke the empty apartment', ja: '燻煙剤（バルサン等）で防虫',
      def: true, due: { a: 'keys', o: 1 }, assign: 'both',
      why: 'A common Japanese move-in habit: use a smoke insecticide while the rooms are empty.',
      how: ['Cover the smoke detectors (火災報知器) with the cover/bag included in the pack. Remove it afterwards!', 'Close the windows, run it for 2–3 hours, then air the rooms out.', 'Optional: anti-mold smoke for the bathroom (防カビくん煙剤).'],
    },
    {
      id: 'clean-new', phase: 'setup', title: 'Clean the new home', ja: '新居の掃除',
      def: true, due: { a: 'keys', o: 2 }, assign: 'both',
      how: ['Wipe the shelves and closets. Clean the kitchen fan, the bathroom and the washing-machine area before moving things in.', 'Put up anti-stain sheets (排気口カバー, レンジフード フィルター) if you like.'],
    },
    {
      id: 'purchase', phase: 'setup', title: 'Buy furniture and essentials', ja: '家具・家電・日用品の購入',
      def: true, due: { a: 'move', o: -12 }, assign: 'both', note: 'shopping',
      why: 'Having a bed, curtains and lights in before moving day makes the first night comfortable.',
      how: ['Use the linked shopping list. Mark items as bought and add prices.', 'Buy bulky items for delivery straight to the new address during the overlap.', 'Check the year-end delivery cutoffs (IKEA, ニトリ, Amazon, 家電量販店).'],
    },
    {
      id: 'deliveries', phase: 'setup', title: 'Schedule deliveries and set-up', ja: '配送・設置の日程調整',
      def: true, due: { a: 'keys', o: 4 }, assign: 'both',
      why: 'Someone must be home for each delivery. Group them on the same days.',
      how: ['Plan delivery days in the Calendar.', 'Confirm the fridge/washer set-up (設置) and disposal of packaging.', 'Tell building management if large deliveries need elevator protection.'],
    },
    {
      id: 'lights-curtains', phase: 'setup', title: 'Install lights and curtains', ja: '照明・カーテンの取り付け',
      def: true, due: { a: 'move', o: -5 }, assign: 'both',
      why: 'Without curtains, people can see inside at night. Without ceiling lights, rooms are dark.',
      how: ['Ceiling lights attach to the 引掛シーリング twist-lock fitting. No electrician needed.', 'Hang curtains (遮光 blackout + レース lace for privacy).'],
    },
    {
      id: 'internet-install', phase: 'setup', title: 'Internet installation and Wi-Fi set-up', ja: '光回線 開通工事・Wi-Fi設定',
      def: true, due: { a: 'move', o: -7 }, assign: 'both',
      how: ['Be home for the installation (工事立会い) if required.', 'Set up the router and give the Wi-Fi the same name and password as before, so devices connect automatically.'],
    },
    {
      id: 'keys-spare', phase: 'setup', title: 'Sort out spare keys', ja: '合鍵の確認',
      def: true, due: { a: 'keys', o: 3 }, assign: 'both',
      why: 'Security keys (ディンプルキー) often cannot be copied at a key shop and must be ordered from the maker, which takes weeks. Some contracts require permission.',
      how: ['Ask management whether copying is allowed.', 'Make sure you each have a key before the move.'],
    },
    {
      id: 'garbage-new', phase: 'setup', title: 'Learn the Shibuya garbage rules', ja: '渋谷区のごみ分別・収集日',
      def: true, due: { a: 'move', o: -3 }, assign: 'both',
      why: 'Sorting rules and collection days differ by ward and by street. Moving creates lots of cardboard!',
      how: ['Check your address’s collection days for 可燃ごみ, 不燃ごみ, 資源 (cans, bottles, PET, paper) and 粗大ごみ.', 'Note the year-end and New Year break in collection, and the building’s garbage area rules.', 'Ask the mover whether they collect used boxes later (段ボール回収).'],
      links: [['渋谷区 ごみの出し方', G('渋谷区 ごみ 分別 収集日')]],
    },
    {
      id: 'disaster', phase: 'setup', title: 'Check the evacuation site and emergency kit', ja: '避難場所の確認・防災グッズ',
      def: true, due: { a: 'move', o: 7 }, assign: 'both',
      how: ['Find your nearest evacuation site (避難場所) on the Shibuya hazard map.', 'Agree on a meeting point. Restock water, food and a flashlight for the new home.', 'Fix tall furniture to the walls (家具転倒防止).'],
      links: [['渋谷区 防災マップ', G('渋谷区 防災マップ 避難場所')]],
    },
    {
      id: 'nameplate', phase: 'setup', title: 'Put your names on the mailbox', ja: '郵便受け・表札の名前',
      def: true, due: { a: 'move', o: -2 }, assign: 'both',
      why: 'Japan Post and couriers may not deliver if the name is not on the mailbox.',
      how: ['Add both family names to the mailbox (and door if you like).'],
    },

    // ---------- PREMOVE ----------
    {
      id: 'tenshutsu', phase: 'premove', title: 'Move-out notification at Minato City Office', ja: '転出届（港区）',
      def: true, due: { a: 'move', o: -4 }, office: 'before', assign: 'both',
      win: { from: { a: 'move', o: -14 } },
      deadline: 'From 14 days before the move. City offices are usually closed 12/29–1/3, so do it before then.',
      why: 'Legally required when moving to a different ward. Without it, you cannot register in Shibuya.',
      how: [
        'Option A (with My Number card): apply online via マイナポータル 引越しワンストップサービス. No visit to Minato is needed and you also book your Shibuya visit.',
        'Option B: visit the Minato City Office or an area branch office (総合支所) and fill in the 転出届. You get a 転出証明書 (move-out certificate). Keep it safe!',
        'One person can file for both if you are in the same household (世帯). Otherwise each of you files, or brings a letter of authorization (委任状).',
      ],
      bring: ['My Number cards', 'Photo ID', 'Seal (印鑑) – just in case'],
      where: 'Minato City Office / 総合支所 (芝・麻布・赤坂・高輪・芝浦港南) or マイナポータル',
      links: [['マイナポータル 引越し手続', 'https://myna.go.jp/'], ['港区 転出届', G('港区 転出届')]],
    },
    {
      id: 'postal', phase: 'premove', title: 'Forward your mail', ja: '郵便の転送届（e転居）',
      def: true, due: { a: 'move', o: -10 }, assign: 'both',
      why: 'Japan Post forwards mail from the old address for 1 year. Registration takes a few business days.',
      how: ['Apply online with e転居 (you each need to apply, or list both of you), or fill in a form at any post office.'],
      links: [['e転居 (Japan Post)', G('e転居 日本郵便')]],
    },
    {
      id: 'building-notice', phase: 'premove', title: 'Tell both buildings about the move', ja: '管理会社への引越し連絡（エレベーター・駐車）',
      def: true, due: { a: 'move', o: -7 }, assign: 'both',
      why: 'Many buildings need advance notice (搬入出届) for elevator protection (養生) and truck parking. Some limit moving hours.',
      how: ['Tell the old and new management companies the date and time slot of the move.', 'Ask about elevator padding, parking for the truck, and moving-hour rules.'],
    },
    {
      id: 'utilities-old', phase: 'premove', title: 'Stop utilities at the old home', ja: '旧居の電気・水道・ガス 停止手続き',
      def: true, due: { a: 'move', o: -7 }, assign: 'both',
      why: 'Set the stop date to your final move-out/cleaning day, not moving day, so you still have lights and water for cleaning.',
      how: ['Electricity and water: online. Gas closing usually needs nobody present.', 'Set up the final bill payment.'],
    },
    {
      id: 'internet-old', phase: 'premove', title: 'Cancel or transfer the old internet', ja: '旧居のインターネット 解約・移転',
      def: true, due: { a: 'move', o: -7 }, assign: 'both',
      how: ['Check for cancellation fees (違約金) and installation-fee balances.', 'Return rental equipment (ONU, router) in the box they send you.'],
    },
    {
      id: 'pack', phase: 'premove', title: 'Pack', ja: '荷造り',
      def: true, due: { a: 'move', o: -1 }, assign: 'both', note: 'packing',
      how: [
        'Start with things you rarely use. Label each box with its room and contents (e.g. 「寝室・本」).',
        'Pack an "open first" box (すぐ使う箱): toilet paper, towels, chargers, tools, bedding, medicine and glasses.',
        'Put heavy items in small boxes and light items in big ones.',
      ],
    },
    {
      id: 'fridge-washer', phase: 'premove', title: 'Prepare the fridge and washing machine', ja: '冷蔵庫の水抜き・洗濯機の水抜き',
      def: true, due: { a: 'move', o: -1 }, assign: 'both',
      why: 'Movers need these drained, or water leaks onto your things.',
      how: ['Use up the food. Unplug the fridge the night before and empty the defrost water tray.', 'Drain the washing-machine hoses (給水ホース・排水ホース) and keep the parts in a bag.'],
    },
    {
      id: 'greet-old', phase: 'premove', title: 'Say goodbye to the old neighbors (optional)', ja: '旧居のご近所へのご挨拶',
      def: false, due: { a: 'move', o: -2 }, assign: 'both',
      why: 'A traditional courtesy, especially if you knew them. Optional in big apartment buildings.',
      how: ['A small gift (¥500–1,000, e.g. sweets) and a thank-you for the noise on moving day.'],
    },

    // ---------- MOVEDAY ----------
    {
      id: 'valuables', phase: 'moveday', title: 'Carry valuables yourselves', ja: '貴重品は自分で運ぶ',
      def: true, due: { a: 'move', o: 0 }, assign: 'both',
      how: ['Cash, passports, My Number cards, 転出証明書, seals, bankbooks, laptops, contracts and keys.'],
    },
    {
      id: 'moveday', phase: 'moveday', title: 'Moving day', ja: '引越し当日',
      def: true, due: { a: 'move', o: 0 }, assign: 'both',
      how: [
        'One person at the old home and one at the new home (or travel ahead of the truck).',
        'Tell the crew where each box goes. Check for damage before signing.',
        'Tipping is not expected in Japan. Bottled drinks for the crew are a kind gesture, and some people give a small 心付け.',
        'Check that the old home is empty, including the closets, balcony and post box.',
      ],
    },
    {
      id: 'greet-new', phase: 'moveday', title: 'Greet the new neighbors', ja: '引越しのご挨拶（新居）',
      def: true, due: { a: 'move', o: 2 }, assign: 'both', note: 'gifts',
      why: 'A Japanese custom that helps start off on a good footing (and makes moving-day noise easier to forgive).',
      how: ['Visit the neighbors on both sides and the units directly above and below. Say 「引っ越してきた○○です。よろしくお願いします」.', 'Bring a small gift (¥500–1,000: towels, detergent, sweets), wrapped with のし 「御挨拶」 and your family name.', 'If nobody answers, leave the gift with a short note. Some couples skip this in large buildings, which is fine too.'],
    },
    {
      id: 'soba', phase: 'moveday', title: 'Eat moving soba', ja: '引越しそば',
      def: true, due: { a: 'move', o: 0 }, assign: 'both',
      why: 'A fun Edo-era custom. Soba (そば) also sounds like "near you" (お側に), wishing you a long life together. Perfect for the first night in the new home.',
      how: ['Order in or make soba on the first night.'],
    },

    // ---------- AFTER ----------
    {
      id: 'tennyu', phase: 'after', title: 'Move-in notification at Shibuya City Office', ja: '転入届（渋谷区）',
      def: true, due: { a: 'move', o: 1 }, office: 'after', assign: 'both', hard: { a: 'move', o: 14 },
      deadline: 'Legally within 14 days of starting to live there. Offices are usually closed 12/29–1/3.',
      why: 'Registers your new address (住民票). Needed for your My Number card, driver’s license, health insurance, tax and voting.',
      how: [
        'Visit the Shibuya City Office (Udagawa-cho) or check which branch offices (出張所) handle 転入.',
        'Fill in the 転入届 form. Each adult must come, or bring a letter of authorization (委任状).',
        'Ask for 1–2 copies of 住民票 if you need them for your license, bank or employer.',
      ],
      bring: ['転出証明書 (unless you did the online My Number move-out)', 'My Number cards + 4-digit PINs', 'Photo ID'],
      where: '渋谷区役所 (Shibuya City Office)',
      links: [['渋谷区 転入届', G('渋谷区 転入届 必要なもの')]],
    },
    {
      id: 'myna-update', phase: 'after', title: 'Update the address on your My Number cards', ja: 'マイナンバーカードの住所変更',
      cond: 'myna', due: { a: 'move', o: 1 }, office: 'after', assign: 'both',
      why: 'Do this in the same visit as the 転入届. If you delay, the card can become invalid (失効).',
      how: ['Each person enters their 4-digit PIN (暗証番号), and the new address is printed on the back of the card.', 'If you forget the PIN, ask for a reset. Bring other ID.'],
      bring: ['My Number cards', 'PINs'],
      where: '渋谷区役所',
    },
    {
      id: 'zairyu', phase: 'after', title: 'Update the Residence Card address', ja: '在留カードの住居地変更',
      cond: 'foreign', due: { a: 'move', o: 1 }, office: 'after', assign: 'both', hard: { a: 'move', o: 14 },
      deadline: 'Within 14 days of moving (required by immigration law)',
      why: 'Done at the ward office together with the 転入届.',
      bring: ['在留カード', 'Passport', '転出証明書'],
      where: '渋谷区役所',
    },
    {
      id: 'nhi', phase: 'after', title: 'Move your National Health Insurance', ja: '国民健康保険・国民年金の手続き',
      cond: 'nhi', due: { a: 'move', o: 1 }, office: 'after', assign: 'both',
      why: 'National Health Insurance is managed by each ward. Leave the Minato plan when you move out and join Shibuya’s when you move in.',
      how: ['At Minato: handled with the 転出届 (return your old card if asked).', 'At Shibuya: join right after the 転入届 and get your new card.', 'Pension (国民年金) address changes are usually automatic when you have a My Number.'],
    },
    {
      id: 'inkan', phase: 'after', title: 'Register your seal in Shibuya', ja: '印鑑登録（渋谷区）',
      cond: 'inkan', due: { a: 'move', o: 1 }, office: 'after', assign: 'both',
      why: 'Your Minato seal registration is cancelled automatically when you move out of the ward. Re-register only if you need a 実印 (registered seal) for things like cars, property or loans.',
      bring: ['The seal (実印)', 'Photo ID'],
      where: '渋谷区役所',
    },
    {
      id: 'pet', phase: 'after', title: 'Update the dog registration', ja: '犬の登録変更',
      cond: 'pet', due: { a: 'move', o: 14 }, assign: 'both',
      how: ['Report the new address to Shibuya-ku with your dog registration (鑑札) and rabies vaccination tag.'],
    },
    {
      id: 'employer', phase: 'after', title: 'Tell your employers', ja: '勤務先への住所変更届',
      def: true, due: { a: 'move', o: 5 }, assign: 'both',
      why: 'Your commuting allowance (通勤手当), year-end tax adjustment (年末調整), health insurance and pension records all use your address.',
      how: ['Submit the address-change form with your new commute route and pass cost.', 'Ask whether they need a 住民票 copy.'],
    },
    {
      id: 'license', phase: 'after', title: 'Update the address on your driver’s license', ja: '運転免許証の住所変更',
      cond: 'license', due: { a: 'move', o: 7 }, office: 'after', assign: 'both',
      why: 'Your license is often used as ID, and renewal notices go to the registered address.',
      how: ['Go to a police station covering the new address (渋谷・原宿・代々木警察署) or a license center.', 'If your license is linked to your My Number card (マイナ免許証), the process may be different. Check first.'],
      bring: ['Driver’s license', '住民票 (no My Number printed) or My Number card'],
      links: [['警視庁 記載事項変更', 'https://www.keishicho.metro.tokyo.lg.jp/']],
    },
    {
      id: 'car', phase: 'after', title: 'Car parking certificate and registration', ja: '車庫証明・車検証の住所変更',
      cond: 'carOwner', due: { a: 'move', o: 14 }, assign: 'both',
      how: ['Get a new parking certificate (車庫証明) at the police station.', 'Then update the vehicle registration (車検証) at the Transport Bureau within 15 days.'],
    },
    {
      id: 'banks', phase: 'after', title: 'Update banks, cards and insurance', ja: '銀行・クレジットカード・保険の住所変更',
      def: true, due: { a: 'move', o: 14 }, assign: 'both', note: 'addresses',
      how: ['Most can be done online or in the app. Track them in the linked checklist.', 'Remember your securities account, life and medical insurance, and the fire insurance on the new home.'],
    },
    {
      id: 'services', phase: 'after', title: 'Update phone and online accounts', ja: '携帯・通販・各種サービスの住所変更',
      def: true, due: { a: 'move', o: 14 }, assign: 'both', note: 'addresses',
      how: ['Your mobile carrier, Amazon/楽天 delivery addresses, food delivery, subscriptions, ふるさと納税, gym, clinics and point cards.'],
    },
    {
      id: 'nhk', phase: 'after', title: 'Change your NHK address', ja: 'NHKの住所変更',
      cond: 'nhk', due: { a: 'move', o: 14 }, assign: 'both',
      how: ['Online. If you now live together on one contract, you can cancel or merge the duplicate contract.'],
      links: [['NHK 住所変更', 'https://www.nhk-cs.jp/']],
    },
    {
      id: 'housewarming', phase: 'after', title: 'Housewarming party', ja: '引越し祝い・ホームパーティー',
      def: false, due: { a: 'move', o: 30 }, assign: 'both',
      how: ['Invite friends once boxes are gone. In Japan guests often bring 引越し祝い gifts. Small return gifts are optional.'],
    },

    // ---------- MOVEOUT ----------
    {
      id: 'leftover', phase: 'moveout', title: 'Remove remaining items from the old home', ja: '残置物の処分',
      def: true, due: { a: 'oldEnd', o: -10 }, assign: 'both',
      why: 'Anything left behind may be charged as disposal costs.',
      how: ['Book the final 粗大ごみ pickup well before the inspection.', 'Take down curtains, lights you installed, and anything stuck to walls (remove hooks carefully).'],
    },
    {
      id: 'clean-old', phase: 'moveout', title: 'Clean the old home', ja: '旧居の掃除',
      def: true, due: { a: 'oldEnd', o: -6 }, assign: 'both',
      why: 'A clean home makes the inspection go smoothly. Many contracts already charge a fixed cleaning fee (ハウスクリーニング費), so check before over-cleaning.',
      how: ['Kitchen grease, bathroom mold, the AC filter, and the washing-machine area.'],
    },
    {
      id: 'tachiai', phase: 'moveout', title: 'Move-out inspection', ja: '退去立会い',
      def: true, due: { a: 'oldEnd', o: -4 }, assign: 'both',
      why: 'The management company checks the condition of the home and decides what is deducted from your deposit.',
      how: [
        'Book it 1–2 weeks ahead. Weekend slots fill up.',
        'Under the MLIT guideline (原状回復ガイドライン), normal wear and tear (通常損耗・経年劣化) is the landlord’s cost.',
        'Do not sign anything you disagree with on the spot. Ask for an itemized estimate (見積書).',
        'Hand back all keys, including copies.',
      ],
      bring: ['All keys', 'Move-in photos', 'Bank account details for the deposit refund'],
      links: [['国交省 原状回復ガイドライン', 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk3_000020.html']],
    },
    {
      id: 'deposit', phase: 'moveout', title: 'Check the deposit refund', ja: '敷金精算の確認',
      def: true, due: { a: 'oldEnd', o: 30 }, assign: 'both',
      how: ['Check the itemized settlement (敷金精算書), usually within about a month.', 'Question any charges for normal wear and tear. Tokyo also has rules for rental disputes (東京ルール).'],
      links: [['東京ルール (賃貸住宅紛争防止条例)', G('東京ルール 賃貸住宅紛争防止条例')]],
    },
    {
      id: 'final-bills', phase: 'moveout', title: 'Pay the final utility bills', ja: '旧居の最終精算',
      def: true, due: { a: 'oldEnd', o: 14 }, assign: 'both',
      how: ['Check the final electricity, water, gas and internet bills, and the final rent.'],
    },
  ];

  // Linked-note templates.
  const NOTE_TEMPLATES = {
    shopping: {
      title: 'Shopping list for the new home', body: 'Mark items as bought and add prices. Totals show up in Budget.',
      items: [
        ['Bed frame', 'Bedroom'], ['Mattress', 'Bedroom'], ['Winter duvet + cover (掛け布団)', 'Bedroom'], ['Pillows', 'Bedroom'], ['Sheets', 'Bedroom'],
        ['Blackout curtains (遮光) – bedroom', 'Windows'], ['Lace curtains (レース) – bedroom', 'Windows'], ['Curtains – living room', 'Windows'], ['Curtain hooks / rods', 'Windows'],
        ['Ceiling light – living room', 'Lighting'], ['Ceiling light – bedroom', 'Lighting'], ['Ceiling light – hallway', 'Lighting'],
        ['Fridge', 'Kitchen'], ['Microwave', 'Kitchen'], ['Rice cooker', 'Kitchen'], ['Kettle', 'Kitchen'], ['Trash cans (sorted)', 'Kitchen'],
        ['Washing machine', 'Laundry'], ['Laundry poles / hangers', 'Laundry'],
        ['Bath mat & shower curtain', 'Bathroom'], ['Toilet brush & cleaner', 'Bathroom'], ['Toilet paper', 'Bathroom'],
        ['Wi-Fi router', 'Living'], ['Extension cords / power strips', 'Living'], ['Heater / kotatsu', 'Living'],
        ['Furniture anti-tip brackets (転倒防止)', 'Safety'], ['Smoke insecticide (バルサン)', 'Safety'],
      ],
    },
    measure: {
      title: 'Measurements', body: 'Width × height in cm.',
      items: [['Living room window', 'Windows'], ['Bedroom window', 'Windows'], ['Other window', 'Windows'], ['Washing machine pan (防水パン)', 'Spaces'], ['Fridge space (W×D×H)', 'Spaces'], ['Entrance door width', 'Access'], ['Elevator door / depth', 'Access'], ['Bedroom size', 'Rooms'], ['Living room size', 'Rooms']],
    },
    quotes: {
      title: 'Moving company quotes', body: 'Company – date/slot – price – notes',
      items: [['Company 1', 'Quote'], ['Company 2', 'Quote'], ['Company 3', 'Quote']],
    },
    dispose: {
      title: 'Things to get rid of', body: 'Sell (メルカリ/ジモティー), give away, 粗大ごみ, or recycle.',
      items: [['', '粗大ごみ'], ['', 'Sell'], ['', 'Give away']],
    },
    packing: {
      title: 'Packing & open-first box', body: 'Label boxes with their room. Keep the open-first box with you.',
      items: [['Toilet paper', 'Open first'], ['Towels', 'Open first'], ['Phone chargers', 'Open first'], ['Scissors / box cutter / screwdriver', 'Open first'], ['Bedding for night 1', 'Open first'], ['Medicine / contacts / glasses', 'Open first'], ['Slippers', 'Open first'], ['Garbage bags', 'Open first'], ['Kitchen', 'Boxes'], ['Bedroom', 'Boxes'], ['Books', 'Boxes'], ['Clothes', 'Boxes']],
    },
    gifts: {
      title: 'Neighbor greeting gifts', body: '¥500–1,000 each, with のし「御挨拶」 + family name.',
      items: [['Left neighbor', 'New home'], ['Right neighbor', 'New home'], ['Upstairs', 'New home'], ['Downstairs', 'New home'], ['Building manager (管理人)', 'New home']],
    },
    addresses: {
      title: 'Address-change tracker', body: 'Tick off every service once its address is updated.',
      items: [['Bank 1', 'Finance'], ['Bank 2', 'Finance'], ['Credit cards', 'Finance'], ['Securities account', 'Finance'], ['Life / medical insurance', 'Finance'], ['Mobile carrier', 'Services'], ['Amazon', 'Shopping'], ['楽天', 'Shopping'], ['Food delivery apps', 'Shopping'], ['Subscriptions', 'Services'], ['Gym', 'Services'], ['Clinics / dentist', 'Services'], ['ふるさと納税 sites', 'Services']],
    },
  };

  const HOLIDAYS = { '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日', '2027-01-01': '元日', '2027-01-11': '成人の日', '2027-02-11': '建国記念の日', '2027-02-23': '天皇誕生日' };

  window.MOVE_DATA = { PROFILE, STEPS, NOTE_TEMPLATES, HOLIDAYS };
})();
