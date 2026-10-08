/* ============================================
   MILTHA — Bible Data
   Book lists and study notes
   Verse text is loaded per book from data/bible/ (see tools/build_bible.py)
   ============================================ */

const BIBLE_BOOKS = [
  {id:'matthew',name:'MATTHEW',ch:28,author:'Matthew (Levi)',written:'c. 50–70 AD',peshitta:'ܡܬܝ',theme:'The King of Israel'},
  {id:'mark',name:'MARK',ch:16,author:'John Mark',written:'c. 45–60 AD',peshitta:'ܡܪܩܘܣ',theme:'The Servant of the LORD'},
  {id:'luke',name:'LUKE',ch:24,author:'Luke the Physician',written:'c. 60–80 AD',peshitta:'ܠܘܩܐ',theme:'The Son of Man'},
  {id:'john',name:'JOHN',ch:21,author:'John the Apostle',written:'c. 85–95 AD',peshitta:'ܝܘܚܢܢ',theme:'The Son of God'},
  {id:'acts',name:'ACTS',ch:28,author:'Luke the Physician',written:'c. 62–80 AD',peshitta:'ܦܪܟܣܝܣ',theme:'The Acts of the Holy Spirit'},
  {id:'romans',name:'ROMANS',ch:16,author:'Paul the Apostle',written:'c. 57 AD',peshitta:'ܪܗܘܡܝܐ',theme:'The Righteousness of God'},
  {id:'1corinthians',name:'1 CORINTHIANS',ch:16,author:'Paul the Apostle',written:'c. 53–54 AD',peshitta:'ܩܘܪ̈ܢܬܝܐ ܐ',theme:'Order and Unity in the Church'},
  {id:'2corinthians',name:'2 CORINTHIANS',ch:13,author:'Paul the Apostle',written:'c. 55–56 AD',peshitta:'ܩܘܪ̈ܢܬܝܐ ܒ',theme:'The Ministry of Reconciliation'},
  {id:'galatians',name:'GALATIANS',ch:6,author:'Paul the Apostle',written:'c. 48–55 AD',peshitta:'ܓܠܛܝܐ',theme:'Freedom in Christ'},
  {id:'ephesians',name:'EPHESIANS',ch:6,author:'Paul the Apostle',written:'c. 60–62 AD',peshitta:'ܐܦܣܝܐ',theme:'The Body of Christ'},
  {id:'philippians',name:'PHILIPPIANS',ch:4,author:'Paul the Apostle',written:'c. 61 AD',peshitta:'ܦܝܠܝܦܣܝܐ',theme:'Joy in Christ'},
  {id:'colossians',name:'COLOSSIANS',ch:4,author:'Paul the Apostle',written:'c. 60–62 AD',peshitta:'ܩܘܠܣܝܐ',theme:'The Preeminence of Christ'},
  {id:'1thessalonians',name:'1 THESSALONIANS',ch:5,author:'Paul the Apostle',written:'c. 50–51 AD',peshitta:'ܬܣܠܘܢܝܩܝܐ ܐ',theme:'The Coming of the Lord'},
  {id:'2thessalonians',name:'2 THESSALONIANS',ch:3,author:'Paul the Apostle',written:'c. 51–52 AD',peshitta:'ܬܣܠܘܢܝܩܝܐ ܒ',theme:'The Day of the Lord'},
  {id:'1timothy',name:'1 TIMOTHY',ch:6,author:'Paul the Apostle',written:'c. 62–65 AD',peshitta:'ܛܝܡܬܐܘܣ ܐ',theme:'Sound Doctrine'},
  {id:'2timothy',name:'2 TIMOTHY',ch:4,author:'Paul the Apostle',written:'c. 64–67 AD',peshitta:'ܛܝܡܬܐܘܣ ܒ',theme:'Enduring to the End'},
  {id:'titus',name:'TITUS',ch:3,author:'Paul the Apostle',written:'c. 63–65 AD',peshitta:'ܛܝܛܘܣ',theme:'The Grace of God'},
  {id:'philemon',name:'PHILEMON',ch:1,author:'Paul the Apostle',written:'c. 60–62 AD',peshitta:'ܦܝܠܝܡܘܢ',theme:'Forgiveness and Restoration'},
  {id:'hebrews',name:'HEBREWS',ch:13,author:'Unknown (Paul/Apollos)',written:'c. 60–70 AD',peshitta:'ܥܒܪ̈ܝܐ',theme:'Christ the High Priest'},
  {id:'james',name:'JAMES',ch:5,author:'James, brother of Jesus',written:'c. 45–50 AD',peshitta:'ܝܥܩܘܒ',theme:'Faith and Works'},
  {id:'1peter',name:'1 PETER',ch:5,author:'Peter the Apostle',written:'c. 60–65 AD',peshitta:'ܦܛܪܘܣ ܐ',theme:'Suffering and Glory'},
  {id:'2peter',name:'2 PETER',ch:3,author:'Peter the Apostle',written:'c. 64–68 AD',peshitta:'ܦܛܪܘܣ ܒ',theme:'The Divine Nature'},
  {id:'1john',name:'1 JOHN',ch:5,author:'John the Apostle',written:'c. 85–100 AD',peshitta:'ܝܘܚܢܢ ܐ',theme:'God is Love'},
  {id:'2john',name:'2 JOHN',ch:1,author:'John the Apostle',written:'c. 85–100 AD',peshitta:'ܝܘܚܢܢ ܒ',theme:'Walk in Truth'},
  {id:'3john',name:'3 JOHN',ch:1,author:'John the Apostle',written:'c. 85–100 AD',peshitta:'ܝܘܚܢܢ ܓ',theme:'Hospitality and Truth'},
  {id:'jude',name:'JUDE',ch:1,author:'Jude, brother of Jesus',written:'c. 65–80 AD',peshitta:'ܝܗܘܕܐ',theme:'Contend for the Faith'},
  {id:'revelation',name:'REVELATION',ch:22,author:'John the Apostle',written:'c. 90–96 AD',peshitta:'ܓܠܝܢܐ',theme:'The Revelation of Jesus Christ'}
];

// Key passage for each book — shown when full text not yet loaded
const KEY_PASSAGES = {
  matthew:{ch:5,label:'SERMON ON THE MOUNT'},
  mark:{ch:1,label:'BEGINNING OF THE GOSPEL'},
  luke:{ch:1,label:'THE MAGNIFICAT'},
  john:{ch:1,label:'THE WORD INCARNATE'},
  acts:{ch:2,label:'PENTECOST'},
  romans:{ch:8,label:'NO CONDEMNATION'},
  '1corinthians':{ch:13,label:'THE LOVE CHAPTER'},
  '2corinthians':{ch:12,label:'SUFFICIENT GRACE'},
  galatians:{ch:5,label:'FRUIT OF THE SPIRIT'},
  ephesians:{ch:2,label:'SAVED BY GRACE'},
  philippians:{ch:4,label:'REJOICE ALWAYS'},
  colossians:{ch:1,label:'PREEMINENCE OF CHRIST'},
  '1thessalonians':{ch:4,label:'THE RESURRECTION'},
  '2thessalonians':{ch:2,label:'THE MAN OF LAWLESSNESS'},
  '1timothy':{ch:3,label:'QUALIFICATIONS FOR ELDERS'},
  '2timothy':{ch:3,label:'ALL SCRIPTURE'},
  titus:{ch:2,label:'SOUND DOCTRINE'},
  philemon:{ch:1,label:'APPEAL FOR ONESIMUS'},
  hebrews:{ch:11,label:'HALL OF FAITH'},
  james:{ch:1,label:'FAITH AND TRIALS'},
  '1peter':{ch:1,label:'LIVING HOPE'},
  '2peter':{ch:1,label:'DIVINE NATURE'},
  '1john':{ch:1,label:'THE WORD OF LIFE'},
  '2john':{ch:1,label:'WALK IN TRUTH'},
  '3john':{ch:1,label:'GAIUS AND HOSPITALITY'},
  jude:{ch:1,label:'CONTEND FOR THE FAITH'},
  revelation:{ch:1,label:'VISION OF CHRIST'}
};

// Manuscript notes — verses where KJV differs from earliest manuscripts
const MS_NOTES = {
  'john-7-53': 'MANUSCRIPT NOTE: This passage (John 7:53–8:11, the woman caught in adultery) does not appear in the Peshitta or the earliest Greek manuscripts (Papyrus 66, P75, Codex Sinaiticus, Codex Vaticanus). It is an early oral tradition not part of John\'s original composition.',
  'john-5-4': 'MANUSCRIPT NOTE: The troubling of the water by an angel (v.4) is absent from the Peshitta and the earliest Greek manuscripts. It appears to be a scribal addition explaining the statement in v.7.',
  '1john-5-7': 'MANUSCRIPT NOTE: The phrase "in heaven: the Father, the Word, and the Holy Ghost" (the Comma Johanneum) is absent from the Peshitta and from all Greek manuscripts before the 16th century. It was not in John\'s original letter. It first appears in a Latin translation. The earliest Greek MS containing it dates to 1520 AD.',
  'mark-16-9': 'MANUSCRIPT NOTE: Mark 16:9–20 (the "Long Ending") is absent from Codex Sinaiticus and Codex Vaticanus — the oldest complete New Testament manuscripts. Eusebius and Jerome acknowledge its absence in the best manuscripts of their time. The Peshitta includes it. Evidence suggests it is a later addition.'
};

// Verse locations — key verses linked to geographic locations
const VERSE_LOCATIONS = {
  'john-1-28':{name:'BETHANY BEYOND JORDAN',lat:31.83,lng:35.59,note:'Where John baptized — Jesus identified as the Lamb of God (John 1:29)'},
  'john-2-1':{name:'CANA OF GALILEE',lat:32.74,lng:35.34,note:'Site of the first miracle — water into wine (John 2:1-11)'},
  'john-3-1':{name:'JERUSALEM',lat:31.78,lng:35.24,note:'Where Nicodemus came to Jesus by night'},
  'john-4-5':{name:'SYCHAR, SAMARIA',lat:32.21,lng:35.27,note:'The woman at the well — Jacob\'s Well'},
  'john-5-2':{name:'POOL OF BETHESDA',lat:31.78,lng:35.23,note:'Five porticoes confirmed by excavation — City of David, Jerusalem'},
  'john-6-1':{name:'SEA OF GALILEE',lat:32.82,lng:35.58,note:'Feeding of the five thousand — northeast shore'},
  'john-6-59':{name:'CAPERNAUM',lat:32.88,lng:35.57,note:'The Bread of Life discourse — first-century synagogue excavated here'},
  'john-9-7':{name:'POOL OF SILOAM',lat:31.77,lng:35.23,note:'Excavated 2004 — confirmed exactly as described in John 9'},
  'john-11-1':{name:'BETHANY',lat:31.77,lng:35.26,note:'Village of Mary, Martha, and Lazarus — 2 miles from Jerusalem'},
  'john-18-1':{name:'GARDEN OF GETHSEMANE',lat:31.78,lng:35.24,note:'At the foot of the Mount of Olives — where Jesus was arrested'},
  'john-19-17':{name:'GOLGOTHA',lat:31.78,lng:35.23,note:'The Place of the Skull — site of the crucifixion'},
  'acts-2-1':{name:'JERUSALEM',lat:31.78,lng:35.24,note:'The Upper Room — where the Holy Spirit came at Pentecost'},
  'acts-9-3':{name:'DAMASCUS',lat:33.51,lng:36.29,note:'The road to Damascus — Paul\'s conversion (Acts 9:1-9)'},
  'acts-17-22':{name:'ATHENS',lat:37.97,lng:23.73,note:'Mars Hill (Areopagus) — where Paul addressed the philosophers'},
  'acts-28-16':{name:'ROME',lat:41.9,lng:12.49,note:'Paul arrives in Rome — the Gospel reaches the capital of the Empire'},
  'romans-8-1':{name:'ROME (addressed)',lat:41.9,lng:12.49,note:'Paul\'s letter written from Corinth c. 57 AD, addressed to the church in Rome'},
  'ephesians-2-8':{name:'EPHESUS',lat:37.94,lng:27.34,note:'Paul\'s letter to the Ephesian church — c. 60-62 AD from Roman imprisonment'},
  'philippians-4-6':{name:'PHILIPPI',lat:41.01,lng:24.29,note:'Paul\'s letter to the Philippian church — c. 61 AD from Roman imprisonment'},
  'revelation-1-9':{name:'PATMOS',lat:37.32,lng:26.55,note:'The island where John received the Revelation — c. 90-96 AD under Emperor Domitian'},
  'matthew-2-1':{name:'BETHLEHEM',lat:31.71,lng:35.2,note:'Birthplace of Jesus — fulfillment of Micah 5:2'},
  'matthew-3-13':{name:'JORDAN RIVER',lat:31.83,lng:35.55,note:'Baptism of Jesus by John'},
  'matthew-4-13':{name:'CAPERNAUM',lat:32.88,lng:35.57,note:'Jesus\'s base of ministry in Galilee (Matthew 4:13)'},
  'matthew-26-36':{name:'GARDEN OF GETHSEMANE',lat:31.78,lng:35.24,note:'Where Jesus prayed before His arrest (Matthew 26:36-46)'}
};

// Church Father quotes linked to specific passages
const PASSAGE_FATHERS = {
  'john-1':{father:'IGNATIUS OF ANTIOCH',source:'EPISTLE TO THE EPHESIANS · c. 107 AD',text:'There is one Physician who is possessed both of flesh and spirit...God existing in flesh; true life in death...even Jesus Christ our Lord.'},
  'john-3':{father:'IRENAEUS OF LYON',source:'AGAINST HERESIES · c. 180 AD',text:'He became what we are that He might bring us to be even what He is Himself.'},
  'john-14':{father:'TERTULLIAN',source:'AGAINST PRAXEAS · c. 213 AD',text:'We define that there are two, the Father and the Son, and three with the Holy Spirit...which brings about unity in trinity.'},
  'romans-8':{father:'POLYCARP OF SMYRNA',source:'EPISTLE TO THE PHILIPPIANS · c. 110 AD',text:'Knowing then that God is not mocked, we ought to walk worthy of His commandment and glory.'},
  'ephesians-2':{father:'JUSTIN MARTYR',source:'FIRST APOLOGY · c. 155 AD',text:'We who formerly used to murder one another do not only now refrain from making war...willingly die confessing Christ.'},
  'philippians-4':{father:'CLEMENT OF ALEXANDRIA',source:'STROMATA · c. 198 AD',text:'Prayer is the greatest of the high roads that lead to God.'},
  'hebrews-11':{father:'CLEMENT OF ALEXANDRIA',source:'STROMATA · c. 198 AD',text:'Faith is the foundation of all things. Without it the life of men is unstable and tottering.'},
  'revelation-1':{father:'IRENAEUS OF LYON',source:'AGAINST HERESIES · BOOK V · c. 180 AD',text:'John saw the Revelation not long ago, almost in our time, at the end of the reign of Domitian.'},
  'matthew-5':{father:'JUSTIN MARTYR',source:'FIRST APOLOGY · c. 155 AD',text:'His words were short and concise, for He was no sophist, but His word was the power of God.'},
  'colossians-1':{father:'IGNATIUS OF ANTIOCH',source:'EPISTLE TO THE SMYRNAEANS · c. 107 AD',text:'Jesus Christ...of the family of David according to the flesh, but Son of God by the Divine will and power.'}
};

// Old Testament — 39 books. `orig` is the Hebrew title; chapter counts follow the KJV.
const OT_BOOKS = [
  {id:'genesis',name:'GENESIS',ch:50,orig:'בְּרֵאשִׁית',testament:'ot'},
  {id:'exodus',name:'EXODUS',ch:40,orig:'שְׁמוֹת',testament:'ot'},
  {id:'leviticus',name:'LEVITICUS',ch:27,orig:'וַיִּקְרָא',testament:'ot'},
  {id:'numbers',name:'NUMBERS',ch:36,orig:'בְּמִדְבַּר',testament:'ot'},
  {id:'deuteronomy',name:'DEUTERONOMY',ch:34,orig:'דְּבָרִים',testament:'ot'},
  {id:'joshua',name:'JOSHUA',ch:24,orig:'יְהוֹשֻׁעַ',testament:'ot'},
  {id:'judges',name:'JUDGES',ch:21,orig:'שׁוֹפְטִים',testament:'ot'},
  {id:'ruth',name:'RUTH',ch:4,orig:'רוּת',testament:'ot'},
  {id:'1samuel',name:'1 SAMUEL',ch:31,orig:'שְׁמוּאֵל א',testament:'ot'},
  {id:'2samuel',name:'2 SAMUEL',ch:24,orig:'שְׁמוּאֵל ב',testament:'ot'},
  {id:'1kings',name:'1 KINGS',ch:22,orig:'מְלָכִים א',testament:'ot'},
  {id:'2kings',name:'2 KINGS',ch:25,orig:'מְלָכִים ב',testament:'ot'},
  {id:'1chronicles',name:'1 CHRONICLES',ch:29,orig:'דִּבְרֵי הַיָּמִים א',testament:'ot'},
  {id:'2chronicles',name:'2 CHRONICLES',ch:36,orig:'דִּבְרֵי הַיָּמִים ב',testament:'ot'},
  {id:'ezra',name:'EZRA',ch:10,orig:'עֶזְרָא',testament:'ot'},
  {id:'nehemiah',name:'NEHEMIAH',ch:13,orig:'נְחֶמְיָה',testament:'ot'},
  {id:'esther',name:'ESTHER',ch:10,orig:'אֶסְתֵּר',testament:'ot'},
  {id:'job',name:'JOB',ch:42,orig:'אִיּוֹב',testament:'ot'},
  {id:'psalms',name:'PSALMS',ch:150,orig:'תְּהִלִּים',testament:'ot'},
  {id:'proverbs',name:'PROVERBS',ch:31,orig:'מִשְׁלֵי',testament:'ot'},
  {id:'ecclesiastes',name:'ECCLESIASTES',ch:12,orig:'קֹהֶלֶת',testament:'ot'},
  {id:'song',name:'SONG OF SOLOMON',ch:8,orig:'שִׁיר הַשִּׁירִים',testament:'ot'},
  {id:'isaiah',name:'ISAIAH',ch:66,orig:'יְשַׁעְיָהוּ',testament:'ot'},
  {id:'jeremiah',name:'JEREMIAH',ch:52,orig:'יִרְמְיָהוּ',testament:'ot'},
  {id:'lamentations',name:'LAMENTATIONS',ch:5,orig:'אֵיכָה',testament:'ot'},
  {id:'ezekiel',name:'EZEKIEL',ch:48,orig:'יְחֶזְקֵאל',testament:'ot'},
  {id:'daniel',name:'DANIEL',ch:12,orig:'דָּנִיֵּאל',testament:'ot'},
  {id:'hosea',name:'HOSEA',ch:14,orig:'הוֹשֵׁעַ',testament:'ot'},
  {id:'joel',name:'JOEL',ch:3,orig:'יוֹאֵל',testament:'ot'},
  {id:'amos',name:'AMOS',ch:9,orig:'עָמוֹס',testament:'ot'},
  {id:'obadiah',name:'OBADIAH',ch:1,orig:'עֹבַדְיָה',testament:'ot'},
  {id:'jonah',name:'JONAH',ch:4,orig:'יוֹנָה',testament:'ot'},
  {id:'micah',name:'MICAH',ch:7,orig:'מִיכָה',testament:'ot'},
  {id:'nahum',name:'NAHUM',ch:3,orig:'נַחוּם',testament:'ot'},
  {id:'habakkuk',name:'HABAKKUK',ch:3,orig:'חֲבַקּוּק',testament:'ot'},
  {id:'zephaniah',name:'ZEPHANIAH',ch:3,orig:'צְפַנְיָה',testament:'ot'},
  {id:'haggai',name:'HAGGAI',ch:2,orig:'חַגַּי',testament:'ot'},
  {id:'zechariah',name:'ZECHARIAH',ch:14,orig:'זְכַרְיָה',testament:'ot'},
  {id:'malachi',name:'MALACHI',ch:4,orig:'מַלְאָכִי',testament:'ot'},
];
