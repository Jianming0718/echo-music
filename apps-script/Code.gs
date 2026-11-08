var EchoBcrypt = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/bcryptjs/index.js
  var index_exports = {};
  __export(index_exports, {
    compare: () => compare,
    compareSync: () => compareSync,
    decodeBase64: () => decodeBase64,
    default: () => index_default,
    encodeBase64: () => encodeBase64,
    genSalt: () => genSalt,
    genSaltSync: () => genSaltSync,
    getRounds: () => getRounds,
    getSalt: () => getSalt,
    hash: () => hash,
    hashSync: () => hashSync,
    setRandomFallback: () => setRandomFallback,
    truncates: () => truncates
  });

  // scripts/gas-password-runtime.mjs
  var setTimeout = () => {
    throw Error("Apps Script password hashing requires the synchronous bcrypt functions.");
  };

  // gas:crypto
  var crypto_default = {};

  // node_modules/bcryptjs/index.js
  var randomFallback = null;
  function randomBytes(len) {
    try {
      return crypto.getRandomValues(new Uint8Array(len));
    } catch {
    }
    try {
      return crypto_default.randomBytes(len);
    } catch {
    }
    if (!randomFallback) {
      throw Error(
        "Neither WebCryptoAPI nor a crypto module is available. Use bcrypt.setRandomFallback to set an alternative"
      );
    }
    return randomFallback(len);
  }
  function setRandomFallback(random) {
    randomFallback = random;
  }
  function genSaltSync(rounds, seed_length) {
    rounds = rounds || GENSALT_DEFAULT_LOG2_ROUNDS;
    if (typeof rounds !== "number")
      throw Error(
        "Illegal arguments: " + typeof rounds + ", " + typeof seed_length
      );
    if (rounds < 4) rounds = 4;
    else if (rounds > 31) rounds = 31;
    var salt = [];
    salt.push("$2b$");
    if (rounds < 10) salt.push("0");
    salt.push(rounds.toString());
    salt.push("$");
    salt.push(base64_encode(randomBytes(BCRYPT_SALT_LEN), BCRYPT_SALT_LEN));
    return salt.join("");
  }
  function genSalt(rounds, seed_length, callback) {
    if (typeof seed_length === "function")
      callback = seed_length, seed_length = void 0;
    if (typeof rounds === "function") callback = rounds, rounds = void 0;
    if (typeof rounds === "undefined") rounds = GENSALT_DEFAULT_LOG2_ROUNDS;
    else if (typeof rounds !== "number")
      throw Error("illegal arguments: " + typeof rounds);
    function _async(callback2) {
      nextTick(function() {
        try {
          callback2(null, genSaltSync(rounds));
        } catch (err) {
          callback2(err);
        }
      });
    }
    if (callback) {
      if (typeof callback !== "function")
        throw Error("Illegal callback: " + typeof callback);
      _async(callback);
    } else
      return new Promise(function(resolve, reject) {
        _async(function(err, res) {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      });
  }
  function hashSync(password, salt) {
    if (typeof salt === "undefined") salt = GENSALT_DEFAULT_LOG2_ROUNDS;
    if (typeof salt === "number") salt = genSaltSync(salt);
    if (typeof password !== "string" || typeof salt !== "string")
      throw Error("Illegal arguments: " + typeof password + ", " + typeof salt);
    return _hash(password, salt);
  }
  function hash(password, salt, callback, progressCallback) {
    function _async(callback2) {
      if (typeof password === "string" && typeof salt === "number")
        genSalt(salt, function(err, salt2) {
          _hash(password, salt2, callback2, progressCallback);
        });
      else if (typeof password === "string" && typeof salt === "string")
        _hash(password, salt, callback2, progressCallback);
      else
        nextTick(
          callback2.bind(
            this,
            Error("Illegal arguments: " + typeof password + ", " + typeof salt)
          )
        );
    }
    if (callback) {
      if (typeof callback !== "function")
        throw Error("Illegal callback: " + typeof callback);
      _async(callback);
    } else
      return new Promise(function(resolve, reject) {
        _async(function(err, res) {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      });
  }
  function safeStringCompare(known, unknown) {
    var diff = known.length ^ unknown.length;
    for (var i = 0; i < known.length; ++i) {
      diff |= known.charCodeAt(i) ^ unknown.charCodeAt(i);
    }
    return diff === 0;
  }
  function compareSync(password, hash2) {
    if (typeof password !== "string" || typeof hash2 !== "string")
      throw Error("Illegal arguments: " + typeof password + ", " + typeof hash2);
    if (hash2.length !== 60) return false;
    return safeStringCompare(
      hashSync(password, hash2.substring(0, hash2.length - 31)),
      hash2
    );
  }
  function compare(password, hashValue, callback, progressCallback) {
    function _async(callback2) {
      if (typeof password !== "string" || typeof hashValue !== "string") {
        nextTick(
          callback2.bind(
            this,
            Error(
              "Illegal arguments: " + typeof password + ", " + typeof hashValue
            )
          )
        );
        return;
      }
      if (hashValue.length !== 60) {
        nextTick(callback2.bind(this, null, false));
        return;
      }
      hash(
        password,
        hashValue.substring(0, 29),
        function(err, comp) {
          if (err) callback2(err);
          else callback2(null, safeStringCompare(comp, hashValue));
        },
        progressCallback
      );
    }
    if (callback) {
      if (typeof callback !== "function")
        throw Error("Illegal callback: " + typeof callback);
      _async(callback);
    } else
      return new Promise(function(resolve, reject) {
        _async(function(err, res) {
          if (err) {
            reject(err);
            return;
          }
          resolve(res);
        });
      });
  }
  function getRounds(hash2) {
    if (typeof hash2 !== "string")
      throw Error("Illegal arguments: " + typeof hash2);
    return parseInt(hash2.split("$")[2], 10);
  }
  function getSalt(hash2) {
    if (typeof hash2 !== "string")
      throw Error("Illegal arguments: " + typeof hash2);
    if (hash2.length !== 60)
      throw Error("Illegal hash length: " + hash2.length + " != 60");
    return hash2.substring(0, 29);
  }
  function truncates(password) {
    if (typeof password !== "string")
      throw Error("Illegal arguments: " + typeof password);
    return utf8Length(password) > 72;
  }
  var nextTick = typeof setImmediate === "function" ? setImmediate : typeof scheduler === "object" && typeof scheduler.postTask === "function" ? scheduler.postTask.bind(scheduler) : setTimeout;
  function utf8Length(string) {
    var len = 0, c = 0;
    for (var i = 0; i < string.length; ++i) {
      c = string.charCodeAt(i);
      if (c < 128) len += 1;
      else if (c < 2048) len += 2;
      else if ((c & 64512) === 55296 && (string.charCodeAt(i + 1) & 64512) === 56320) {
        ++i;
        len += 4;
      } else len += 3;
    }
    return len;
  }
  function utf8Array(string) {
    var offset = 0, c1, c2;
    var buffer = new Array(utf8Length(string));
    for (var i = 0, k = string.length; i < k; ++i) {
      c1 = string.charCodeAt(i);
      if (c1 < 128) {
        buffer[offset++] = c1;
      } else if (c1 < 2048) {
        buffer[offset++] = c1 >> 6 | 192;
        buffer[offset++] = c1 & 63 | 128;
      } else if ((c1 & 64512) === 55296 && ((c2 = string.charCodeAt(i + 1)) & 64512) === 56320) {
        c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
        ++i;
        buffer[offset++] = c1 >> 18 | 240;
        buffer[offset++] = c1 >> 12 & 63 | 128;
        buffer[offset++] = c1 >> 6 & 63 | 128;
        buffer[offset++] = c1 & 63 | 128;
      } else {
        buffer[offset++] = c1 >> 12 | 224;
        buffer[offset++] = c1 >> 6 & 63 | 128;
        buffer[offset++] = c1 & 63 | 128;
      }
    }
    return buffer;
  }
  var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
  var BASE64_INDEX = [
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    0,
    1,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    62,
    63,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    -1,
    -1,
    -1,
    -1,
    -1,
    -1,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    52,
    53,
    -1,
    -1,
    -1,
    -1,
    -1
  ];
  function base64_encode(b, len) {
    var off = 0, rs = [], c1, c2;
    if (len <= 0 || len > b.length) throw Error("Illegal len: " + len);
    while (off < len) {
      c1 = b[off++] & 255;
      rs.push(BASE64_CODE[c1 >> 2 & 63]);
      c1 = (c1 & 3) << 4;
      if (off >= len) {
        rs.push(BASE64_CODE[c1 & 63]);
        break;
      }
      c2 = b[off++] & 255;
      c1 |= c2 >> 4 & 15;
      rs.push(BASE64_CODE[c1 & 63]);
      c1 = (c2 & 15) << 2;
      if (off >= len) {
        rs.push(BASE64_CODE[c1 & 63]);
        break;
      }
      c2 = b[off++] & 255;
      c1 |= c2 >> 6 & 3;
      rs.push(BASE64_CODE[c1 & 63]);
      rs.push(BASE64_CODE[c2 & 63]);
    }
    return rs.join("");
  }
  function base64_decode(s, len) {
    var off = 0, slen = s.length, olen = 0, rs = [], c1, c2, c3, c4, o, code;
    if (len <= 0) throw Error("Illegal len: " + len);
    while (off < slen - 1 && olen < len) {
      code = s.charCodeAt(off++);
      c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      code = s.charCodeAt(off++);
      c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      if (c1 == -1 || c2 == -1) break;
      o = c1 << 2 >>> 0;
      o |= (c2 & 48) >> 4;
      rs.push(String.fromCharCode(o));
      if (++olen >= len || off >= slen) break;
      code = s.charCodeAt(off++);
      c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      if (c3 == -1) break;
      o = (c2 & 15) << 4 >>> 0;
      o |= (c3 & 60) >> 2;
      rs.push(String.fromCharCode(o));
      if (++olen >= len || off >= slen) break;
      code = s.charCodeAt(off++);
      c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
      o = (c3 & 3) << 6 >>> 0;
      o |= c4;
      rs.push(String.fromCharCode(o));
      ++olen;
    }
    var res = [];
    for (off = 0; off < olen; off++) res.push(rs[off].charCodeAt(0));
    return res;
  }
  var BCRYPT_SALT_LEN = 16;
  var GENSALT_DEFAULT_LOG2_ROUNDS = 10;
  var BLOWFISH_NUM_ROUNDS = 16;
  var MAX_EXECUTION_TIME = 100;
  var P_ORIG = [
    608135816,
    2242054355,
    320440878,
    57701188,
    2752067618,
    698298832,
    137296536,
    3964562569,
    1160258022,
    953160567,
    3193202383,
    887688300,
    3232508343,
    3380367581,
    1065670069,
    3041331479,
    2450970073,
    2306472731
  ];
  var S_ORIG = [
    3509652390,
    2564797868,
    805139163,
    3491422135,
    3101798381,
    1780907670,
    3128725573,
    4046225305,
    614570311,
    3012652279,
    134345442,
    2240740374,
    1667834072,
    1901547113,
    2757295779,
    4103290238,
    227898511,
    1921955416,
    1904987480,
    2182433518,
    2069144605,
    3260701109,
    2620446009,
    720527379,
    3318853667,
    677414384,
    3393288472,
    3101374703,
    2390351024,
    1614419982,
    1822297739,
    2954791486,
    3608508353,
    3174124327,
    2024746970,
    1432378464,
    3864339955,
    2857741204,
    1464375394,
    1676153920,
    1439316330,
    715854006,
    3033291828,
    289532110,
    2706671279,
    2087905683,
    3018724369,
    1668267050,
    732546397,
    1947742710,
    3462151702,
    2609353502,
    2950085171,
    1814351708,
    2050118529,
    680887927,
    999245976,
    1800124847,
    3300911131,
    1713906067,
    1641548236,
    4213287313,
    1216130144,
    1575780402,
    4018429277,
    3917837745,
    3693486850,
    3949271944,
    596196993,
    3549867205,
    258830323,
    2213823033,
    772490370,
    2760122372,
    1774776394,
    2652871518,
    566650946,
    4142492826,
    1728879713,
    2882767088,
    1783734482,
    3629395816,
    2517608232,
    2874225571,
    1861159788,
    326777828,
    3124490320,
    2130389656,
    2716951837,
    967770486,
    1724537150,
    2185432712,
    2364442137,
    1164943284,
    2105845187,
    998989502,
    3765401048,
    2244026483,
    1075463327,
    1455516326,
    1322494562,
    910128902,
    469688178,
    1117454909,
    936433444,
    3490320968,
    3675253459,
    1240580251,
    122909385,
    2157517691,
    634681816,
    4142456567,
    3825094682,
    3061402683,
    2540495037,
    79693498,
    3249098678,
    1084186820,
    1583128258,
    426386531,
    1761308591,
    1047286709,
    322548459,
    995290223,
    1845252383,
    2603652396,
    3431023940,
    2942221577,
    3202600964,
    3727903485,
    1712269319,
    422464435,
    3234572375,
    1170764815,
    3523960633,
    3117677531,
    1434042557,
    442511882,
    3600875718,
    1076654713,
    1738483198,
    4213154764,
    2393238008,
    3677496056,
    1014306527,
    4251020053,
    793779912,
    2902807211,
    842905082,
    4246964064,
    1395751752,
    1040244610,
    2656851899,
    3396308128,
    445077038,
    3742853595,
    3577915638,
    679411651,
    2892444358,
    2354009459,
    1767581616,
    3150600392,
    3791627101,
    3102740896,
    284835224,
    4246832056,
    1258075500,
    768725851,
    2589189241,
    3069724005,
    3532540348,
    1274779536,
    3789419226,
    2764799539,
    1660621633,
    3471099624,
    4011903706,
    913787905,
    3497959166,
    737222580,
    2514213453,
    2928710040,
    3937242737,
    1804850592,
    3499020752,
    2949064160,
    2386320175,
    2390070455,
    2415321851,
    4061277028,
    2290661394,
    2416832540,
    1336762016,
    1754252060,
    3520065937,
    3014181293,
    791618072,
    3188594551,
    3933548030,
    2332172193,
    3852520463,
    3043980520,
    413987798,
    3465142937,
    3030929376,
    4245938359,
    2093235073,
    3534596313,
    375366246,
    2157278981,
    2479649556,
    555357303,
    3870105701,
    2008414854,
    3344188149,
    4221384143,
    3956125452,
    2067696032,
    3594591187,
    2921233993,
    2428461,
    544322398,
    577241275,
    1471733935,
    610547355,
    4027169054,
    1432588573,
    1507829418,
    2025931657,
    3646575487,
    545086370,
    48609733,
    2200306550,
    1653985193,
    298326376,
    1316178497,
    3007786442,
    2064951626,
    458293330,
    2589141269,
    3591329599,
    3164325604,
    727753846,
    2179363840,
    146436021,
    1461446943,
    4069977195,
    705550613,
    3059967265,
    3887724982,
    4281599278,
    3313849956,
    1404054877,
    2845806497,
    146425753,
    1854211946,
    1266315497,
    3048417604,
    3681880366,
    3289982499,
    290971e4,
    1235738493,
    2632868024,
    2414719590,
    3970600049,
    1771706367,
    1449415276,
    3266420449,
    422970021,
    1963543593,
    2690192192,
    3826793022,
    1062508698,
    1531092325,
    1804592342,
    2583117782,
    2714934279,
    4024971509,
    1294809318,
    4028980673,
    1289560198,
    2221992742,
    1669523910,
    35572830,
    157838143,
    1052438473,
    1016535060,
    1802137761,
    1753167236,
    1386275462,
    3080475397,
    2857371447,
    1040679964,
    2145300060,
    2390574316,
    1461121720,
    2956646967,
    4031777805,
    4028374788,
    33600511,
    2920084762,
    1018524850,
    629373528,
    3691585981,
    3515945977,
    2091462646,
    2486323059,
    586499841,
    988145025,
    935516892,
    3367335476,
    2599673255,
    2839830854,
    265290510,
    3972581182,
    2759138881,
    3795373465,
    1005194799,
    847297441,
    406762289,
    1314163512,
    1332590856,
    1866599683,
    4127851711,
    750260880,
    613907577,
    1450815602,
    3165620655,
    3734664991,
    3650291728,
    3012275730,
    3704569646,
    1427272223,
    778793252,
    1343938022,
    2676280711,
    2052605720,
    1946737175,
    3164576444,
    3914038668,
    3967478842,
    3682934266,
    1661551462,
    3294938066,
    4011595847,
    840292616,
    3712170807,
    616741398,
    312560963,
    711312465,
    1351876610,
    322626781,
    1910503582,
    271666773,
    2175563734,
    1594956187,
    70604529,
    3617834859,
    1007753275,
    1495573769,
    4069517037,
    2549218298,
    2663038764,
    504708206,
    2263041392,
    3941167025,
    2249088522,
    1514023603,
    1998579484,
    1312622330,
    694541497,
    2582060303,
    2151582166,
    1382467621,
    776784248,
    2618340202,
    3323268794,
    2497899128,
    2784771155,
    503983604,
    4076293799,
    907881277,
    423175695,
    432175456,
    1378068232,
    4145222326,
    3954048622,
    3938656102,
    3820766613,
    2793130115,
    2977904593,
    26017576,
    3274890735,
    3194772133,
    1700274565,
    1756076034,
    4006520079,
    3677328699,
    720338349,
    1533947780,
    354530856,
    688349552,
    3973924725,
    1637815568,
    332179504,
    3949051286,
    53804574,
    2852348879,
    3044236432,
    1282449977,
    3583942155,
    3416972820,
    4006381244,
    1617046695,
    2628476075,
    3002303598,
    1686838959,
    431878346,
    2686675385,
    1700445008,
    1080580658,
    1009431731,
    832498133,
    3223435511,
    2605976345,
    2271191193,
    2516031870,
    1648197032,
    4164389018,
    2548247927,
    300782431,
    375919233,
    238389289,
    3353747414,
    2531188641,
    2019080857,
    1475708069,
    455242339,
    2609103871,
    448939670,
    3451063019,
    1395535956,
    2413381860,
    1841049896,
    1491858159,
    885456874,
    4264095073,
    4001119347,
    1565136089,
    3898914787,
    1108368660,
    540939232,
    1173283510,
    2745871338,
    3681308437,
    4207628240,
    3343053890,
    4016749493,
    1699691293,
    1103962373,
    3625875870,
    2256883143,
    3830138730,
    1031889488,
    3479347698,
    1535977030,
    4236805024,
    3251091107,
    2132092099,
    1774941330,
    1199868427,
    1452454533,
    157007616,
    2904115357,
    342012276,
    595725824,
    1480756522,
    206960106,
    497939518,
    591360097,
    863170706,
    2375253569,
    3596610801,
    1814182875,
    2094937945,
    3421402208,
    1082520231,
    3463918190,
    2785509508,
    435703966,
    3908032597,
    1641649973,
    2842273706,
    3305899714,
    1510255612,
    2148256476,
    2655287854,
    3276092548,
    4258621189,
    236887753,
    3681803219,
    274041037,
    1734335097,
    3815195456,
    3317970021,
    1899903192,
    1026095262,
    4050517792,
    356393447,
    2410691914,
    3873677099,
    3682840055,
    3913112168,
    2491498743,
    4132185628,
    2489919796,
    1091903735,
    1979897079,
    3170134830,
    3567386728,
    3557303409,
    857797738,
    1136121015,
    1342202287,
    507115054,
    2535736646,
    337727348,
    3213592640,
    1301675037,
    2528481711,
    1895095763,
    1721773893,
    3216771564,
    62756741,
    2142006736,
    835421444,
    2531993523,
    1442658625,
    3659876326,
    2882144922,
    676362277,
    1392781812,
    170690266,
    3921047035,
    1759253602,
    3611846912,
    1745797284,
    664899054,
    1329594018,
    3901205900,
    3045908486,
    2062866102,
    2865634940,
    3543621612,
    3464012697,
    1080764994,
    553557557,
    3656615353,
    3996768171,
    991055499,
    499776247,
    1265440854,
    648242737,
    3940784050,
    980351604,
    3713745714,
    1749149687,
    3396870395,
    4211799374,
    3640570775,
    1161844396,
    3125318951,
    1431517754,
    545492359,
    4268468663,
    3499529547,
    1437099964,
    2702547544,
    3433638243,
    2581715763,
    2787789398,
    1060185593,
    1593081372,
    2418618748,
    4260947970,
    69676912,
    2159744348,
    86519011,
    2512459080,
    3838209314,
    1220612927,
    3339683548,
    133810670,
    1090789135,
    1078426020,
    1569222167,
    845107691,
    3583754449,
    4072456591,
    1091646820,
    628848692,
    1613405280,
    3757631651,
    526609435,
    236106946,
    48312990,
    2942717905,
    3402727701,
    1797494240,
    859738849,
    992217954,
    4005476642,
    2243076622,
    3870952857,
    3732016268,
    765654824,
    3490871365,
    2511836413,
    1685915746,
    3888969200,
    1414112111,
    2273134842,
    3281911079,
    4080962846,
    172450625,
    2569994100,
    980381355,
    4109958455,
    2819808352,
    2716589560,
    2568741196,
    3681446669,
    3329971472,
    1835478071,
    660984891,
    3704678404,
    4045999559,
    3422617507,
    3040415634,
    1762651403,
    1719377915,
    3470491036,
    2693910283,
    3642056355,
    3138596744,
    1364962596,
    2073328063,
    1983633131,
    926494387,
    3423689081,
    2150032023,
    4096667949,
    1749200295,
    3328846651,
    309677260,
    2016342300,
    1779581495,
    3079819751,
    111262694,
    1274766160,
    443224088,
    298511866,
    1025883608,
    3806446537,
    1145181785,
    168956806,
    3641502830,
    3584813610,
    1689216846,
    3666258015,
    3200248200,
    1692713982,
    2646376535,
    4042768518,
    1618508792,
    1610833997,
    3523052358,
    4130873264,
    2001055236,
    3610705100,
    2202168115,
    4028541809,
    2961195399,
    1006657119,
    2006996926,
    3186142756,
    1430667929,
    3210227297,
    1314452623,
    4074634658,
    4101304120,
    2273951170,
    1399257539,
    3367210612,
    3027628629,
    1190975929,
    2062231137,
    2333990788,
    2221543033,
    2438960610,
    1181637006,
    548689776,
    2362791313,
    3372408396,
    3104550113,
    3145860560,
    296247880,
    1970579870,
    3078560182,
    3769228297,
    1714227617,
    3291629107,
    3898220290,
    166772364,
    1251581989,
    493813264,
    448347421,
    195405023,
    2709975567,
    677966185,
    3703036547,
    1463355134,
    2715995803,
    1338867538,
    1343315457,
    2802222074,
    2684532164,
    233230375,
    2599980071,
    2000651841,
    3277868038,
    1638401717,
    4028070440,
    3237316320,
    6314154,
    819756386,
    300326615,
    590932579,
    1405279636,
    3267499572,
    3150704214,
    2428286686,
    3959192993,
    3461946742,
    1862657033,
    1266418056,
    963775037,
    2089974820,
    2263052895,
    1917689273,
    448879540,
    3550394620,
    3981727096,
    150775221,
    3627908307,
    1303187396,
    508620638,
    2975983352,
    2726630617,
    1817252668,
    1876281319,
    1457606340,
    908771278,
    3720792119,
    3617206836,
    2455994898,
    1729034894,
    1080033504,
    976866871,
    3556439503,
    2881648439,
    1522871579,
    1555064734,
    1336096578,
    3548522304,
    2579274686,
    3574697629,
    3205460757,
    3593280638,
    3338716283,
    3079412587,
    564236357,
    2993598910,
    1781952180,
    1464380207,
    3163844217,
    3332601554,
    1699332808,
    1393555694,
    1183702653,
    3581086237,
    1288719814,
    691649499,
    2847557200,
    2895455976,
    3193889540,
    2717570544,
    1781354906,
    1676643554,
    2592534050,
    3230253752,
    1126444790,
    2770207658,
    2633158820,
    2210423226,
    2615765581,
    2414155088,
    3127139286,
    673620729,
    2805611233,
    1269405062,
    4015350505,
    3341807571,
    4149409754,
    1057255273,
    2012875353,
    2162469141,
    2276492801,
    2601117357,
    993977747,
    3918593370,
    2654263191,
    753973209,
    36408145,
    2530585658,
    25011837,
    3520020182,
    2088578344,
    530523599,
    2918365339,
    1524020338,
    1518925132,
    3760827505,
    3759777254,
    1202760957,
    3985898139,
    3906192525,
    674977740,
    4174734889,
    2031300136,
    2019492241,
    3983892565,
    4153806404,
    3822280332,
    352677332,
    2297720250,
    60907813,
    90501309,
    3286998549,
    1016092578,
    2535922412,
    2839152426,
    457141659,
    509813237,
    4120667899,
    652014361,
    1966332200,
    2975202805,
    55981186,
    2327461051,
    676427537,
    3255491064,
    2882294119,
    3433927263,
    1307055953,
    942726286,
    933058658,
    2468411793,
    3933900994,
    4215176142,
    1361170020,
    2001714738,
    2830558078,
    3274259782,
    1222529897,
    1679025792,
    2729314320,
    3714953764,
    1770335741,
    151462246,
    3013232138,
    1682292957,
    1483529935,
    471910574,
    1539241949,
    458788160,
    3436315007,
    1807016891,
    3718408830,
    978976581,
    1043663428,
    3165965781,
    1927990952,
    4200891579,
    2372276910,
    3208408903,
    3533431907,
    1412390302,
    2931980059,
    4132332400,
    1947078029,
    3881505623,
    4168226417,
    2941484381,
    1077988104,
    1320477388,
    886195818,
    18198404,
    3786409e3,
    2509781533,
    112762804,
    3463356488,
    1866414978,
    891333506,
    18488651,
    661792760,
    1628790961,
    3885187036,
    3141171499,
    876946877,
    2693282273,
    1372485963,
    791857591,
    2686433993,
    3759982718,
    3167212022,
    3472953795,
    2716379847,
    445679433,
    3561995674,
    3504004811,
    3574258232,
    54117162,
    3331405415,
    2381918588,
    3769707343,
    4154350007,
    1140177722,
    4074052095,
    668550556,
    3214352940,
    367459370,
    261225585,
    2610173221,
    4209349473,
    3468074219,
    3265815641,
    314222801,
    3066103646,
    3808782860,
    282218597,
    3406013506,
    3773591054,
    379116347,
    1285071038,
    846784868,
    2669647154,
    3771962079,
    3550491691,
    2305946142,
    453669953,
    1268987020,
    3317592352,
    3279303384,
    3744833421,
    2610507566,
    3859509063,
    266596637,
    3847019092,
    517658769,
    3462560207,
    3443424879,
    370717030,
    4247526661,
    2224018117,
    4143653529,
    4112773975,
    2788324899,
    2477274417,
    1456262402,
    2901442914,
    1517677493,
    1846949527,
    2295493580,
    3734397586,
    2176403920,
    1280348187,
    1908823572,
    3871786941,
    846861322,
    1172426758,
    3287448474,
    3383383037,
    1655181056,
    3139813346,
    901632758,
    1897031941,
    2986607138,
    3066810236,
    3447102507,
    1393639104,
    373351379,
    950779232,
    625454576,
    3124240540,
    4148612726,
    2007998917,
    544563296,
    2244738638,
    2330496472,
    2058025392,
    1291430526,
    424198748,
    50039436,
    29584100,
    3605783033,
    2429876329,
    2791104160,
    1057563949,
    3255363231,
    3075367218,
    3463963227,
    1469046755,
    985887462
  ];
  var C_ORIG = [
    1332899944,
    1700884034,
    1701343084,
    1684370003,
    1668446532,
    1869963892
  ];
  function _encipher(lr, off, P, S) {
    var n, l = lr[off], r = lr[off + 1];
    l ^= P[0];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[1];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[2];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[3];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[4];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[5];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[6];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[7];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[8];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[9];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[10];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[11];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[12];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[13];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[14];
    n = S[l >>> 24];
    n += S[256 | l >> 16 & 255];
    n ^= S[512 | l >> 8 & 255];
    n += S[768 | l & 255];
    r ^= n ^ P[15];
    n = S[r >>> 24];
    n += S[256 | r >> 16 & 255];
    n ^= S[512 | r >> 8 & 255];
    n += S[768 | r & 255];
    l ^= n ^ P[16];
    lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
    lr[off + 1] = l;
    return lr;
  }
  function _streamtoword(data, offp) {
    for (var i = 0, word = 0; i < 4; ++i)
      word = word << 8 | data[offp] & 255, offp = (offp + 1) % data.length;
    return { key: word, offp };
  }
  function _key(key, P, S) {
    var offset = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
    for (var i = 0; i < plen; i++)
      sw = _streamtoword(key, offset), offset = sw.offp, P[i] = P[i] ^ sw.key;
    for (i = 0; i < plen; i += 2)
      lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
    for (i = 0; i < slen; i += 2)
      lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
  }
  function _ekskey(data, key, P, S) {
    var offp = 0, lr = [0, 0], plen = P.length, slen = S.length, sw;
    for (var i = 0; i < plen; i++)
      sw = _streamtoword(key, offp), offp = sw.offp, P[i] = P[i] ^ sw.key;
    offp = 0;
    for (i = 0; i < plen; i += 2)
      sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), P[i] = lr[0], P[i + 1] = lr[1];
    for (i = 0; i < slen; i += 2)
      sw = _streamtoword(data, offp), offp = sw.offp, lr[0] ^= sw.key, sw = _streamtoword(data, offp), offp = sw.offp, lr[1] ^= sw.key, lr = _encipher(lr, 0, P, S), S[i] = lr[0], S[i + 1] = lr[1];
  }
  function _crypt(b, salt, rounds, callback, progressCallback) {
    var cdata = C_ORIG.slice(), clen = cdata.length, err;
    if (rounds < 4 || rounds > 31) {
      err = Error("Illegal number of rounds (4-31): " + rounds);
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    if (salt.length !== BCRYPT_SALT_LEN) {
      err = Error(
        "Illegal salt length: " + salt.length + " != " + BCRYPT_SALT_LEN
      );
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    rounds = 1 << rounds >>> 0;
    var P, S, i = 0, j;
    if (typeof Int32Array === "function") {
      P = new Int32Array(P_ORIG);
      S = new Int32Array(S_ORIG);
    } else {
      P = P_ORIG.slice();
      S = S_ORIG.slice();
    }
    _ekskey(salt, b, P, S);
    function next() {
      if (progressCallback) progressCallback(i / rounds);
      if (i < rounds) {
        var start = Date.now();
        for (; i < rounds; ) {
          i = i + 1;
          _key(b, P, S);
          _key(salt, P, S);
          if (Date.now() - start > MAX_EXECUTION_TIME) break;
        }
      } else {
        for (i = 0; i < 64; i++)
          for (j = 0; j < clen >> 1; j++) _encipher(cdata, j << 1, P, S);
        var ret = [];
        for (i = 0; i < clen; i++)
          ret.push((cdata[i] >> 24 & 255) >>> 0), ret.push((cdata[i] >> 16 & 255) >>> 0), ret.push((cdata[i] >> 8 & 255) >>> 0), ret.push((cdata[i] & 255) >>> 0);
        if (callback) {
          callback(null, ret);
          return;
        } else return ret;
      }
      if (callback) nextTick(next);
    }
    if (typeof callback !== "undefined") {
      next();
    } else {
      var res;
      while (true) if (typeof (res = next()) !== "undefined") return res || [];
    }
  }
  function _hash(password, salt, callback, progressCallback) {
    var err;
    if (typeof password !== "string" || typeof salt !== "string") {
      err = Error("Invalid string / salt: Not a string");
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    var minor, offset;
    if (salt.charAt(0) !== "$" || salt.charAt(1) !== "2") {
      err = Error("Invalid salt version: " + salt.substring(0, 2));
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    if (salt.charAt(2) === "$") minor = String.fromCharCode(0), offset = 3;
    else {
      minor = salt.charAt(2);
      if (minor !== "a" && minor !== "b" && minor !== "y" || salt.charAt(3) !== "$") {
        err = Error("Invalid salt revision: " + salt.substring(2, 4));
        if (callback) {
          nextTick(callback.bind(this, err));
          return;
        } else throw err;
      }
      offset = 4;
    }
    if (salt.charAt(offset + 2) > "$") {
      err = Error("Missing salt rounds");
      if (callback) {
        nextTick(callback.bind(this, err));
        return;
      } else throw err;
    }
    var r1 = parseInt(salt.substring(offset, offset + 1), 10) * 10, r2 = parseInt(salt.substring(offset + 1, offset + 2), 10), rounds = r1 + r2, real_salt = salt.substring(offset + 3, offset + 25);
    password += minor >= "a" ? "\0" : "";
    var passwordb = utf8Array(password), saltb = base64_decode(real_salt, BCRYPT_SALT_LEN);
    function finish(bytes) {
      var res = [];
      res.push("$2");
      if (minor >= "a") res.push(minor);
      res.push("$");
      if (rounds < 10) res.push("0");
      res.push(rounds.toString());
      res.push("$");
      res.push(base64_encode(saltb, saltb.length));
      res.push(base64_encode(bytes, C_ORIG.length * 4 - 1));
      return res.join("");
    }
    if (typeof callback == "undefined")
      return finish(_crypt(passwordb, saltb, rounds));
    else {
      _crypt(
        passwordb,
        saltb,
        rounds,
        function(err2, bytes) {
          if (err2) callback(err2, null);
          else callback(null, finish(bytes));
        },
        progressCallback
      );
    }
  }
  function encodeBase64(bytes, length) {
    return base64_encode(bytes, length);
  }
  function decodeBase64(string, length) {
    return base64_decode(string, length);
  }
  var index_default = {
    setRandomFallback,
    genSaltSync,
    genSalt,
    hashSync,
    hash,
    compareSync,
    compare,
    getRounds,
    getSalt,
    truncates,
    encodeBase64,
    decodeBase64
  };
  return __toCommonJS(index_exports);
})();

const ECHO_USER_HEADERS=['user_id','email','display_name','handle','avatar_path','account_status','tier','premium_until','created_at','synced_at','role'];
function onOpen(){SpreadsheetApp.getUi().createMenu('Echo 管理').addItem('初始化连接配置','configureEcho').addItem('安装账号状态同步触发器','installEchoStatusTrigger').addItem('向选中用户发送欢迎邮件','sendWelcomeToSelectedUser').addToUi()}
function echoConfig_(){const p=PropertiesService.getScriptProperties();const config={sheetId:p.getProperty('ECHO_SHEET_ID'),url:p.getProperty('ECHO_SUPABASE_URL'),key:p.getProperty('ECHO_SUPABASE_PUBLISHABLE_KEY')};if(!config.sheetId||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url||'')||!config.key)throw Error('NOT_CONFIGURED');return config}
function echoBook_(){return SpreadsheetApp.openById(echoConfig_().sheetId)}
function echoJson_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)}
function doGet(){let configured=false;try{echoConfig_();configured=true}catch{}return echoJson_({name:'Echo account admin',configured,...echoSheetsHealth_()})}
function doPost(event){let body;try{const raw=event?.postData?.contents||'';if(raw.length>1500000)return echoJson_({ok:false,error:'INVALID_REQUEST'});body=JSON.parse(raw);if(!body||typeof body.action!=='string'||Array.isArray(body))throw Error()}catch{return echoJson_({ok:false,error:'INVALID_REQUEST'})}if(body.action==='sync'){if(PropertiesService.getScriptProperties().getProperty('ECHO_DATA_MODE')==='sheets')return echoJson_({ok:false,error:'MIGRATED_TO_SHEETS'});return echoLegacyPost_(event)}return echoJson_(echoSheetsPost_(body))}
function echoLegacyPost_(event){
 try{
  const raw=event?.postData?.contents||'';if(raw.length>20000)return echoJson_({ok:false,error:'INVALID_REQUEST'});
  const body=JSON.parse(raw);if(body.action!=='sync'||typeof body.access_token!=='string'||body.access_token.length>16000)return echoJson_({ok:false,error:'INVALID_REQUEST'});
  const config=echoConfig_(),headers={apikey:config.key,Authorization:'Bearer '+body.access_token};
  const response=UrlFetchApp.fetch(config.url+'/auth/v1/user',{headers,muteHttpExceptions:true});if(response.getResponseCode()!==200)return echoJson_({ok:false,error:'UNAUTHORIZED'});
  const user=JSON.parse(response.getContentText());if(!/^[0-9a-f-]{36}$/i.test(user.id||''))return echoJson_({ok:false,error:'UNAUTHORIZED'});
  const profileResponse=UrlFetchApp.fetch(config.url+'/rest/v1/profiles?id=eq.'+encodeURIComponent(user.id)+'&select=id,handle,display_name,avatar_path,created_at',{headers,muteHttpExceptions:true});
  const profiles=profileResponse.getResponseCode()===200?JSON.parse(profileResponse.getContentText()):[],profile=profiles[0]||{};
  return echoJson_({ok:true,version:'2',account:syncEchoUser_(user,profile)});
 }catch{return echoJson_({ok:false,error:'SYNC_FAILED'})}
}
function echoText_(value){const text=String(value??'').slice(0,2000);return /^\s*[=+@-]/.test(text)?"'"+text:text}
function syncEchoUser_(user,profile){
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=echoBook_().getSheetByName('Users');if(!sheet)throw Error('MISSING_USERS_SHEET');
  const data=sheet.getDataRange().getValues();let index=data.findIndex((row,i)=>i>0&&String(row[0])===user.id);
  const previous=index>0?data[index]:[],status=previous[5]||'active',tier=previous[6]||'free',until=previous[7] instanceof Date?previous[7].toISOString():String(previous[7]||'');
  if(!['active','suspended','disabled'].includes(status)||!['free','premium'].includes(tier)||(until&&!Number.isFinite(Date.parse(until))))throw Error('INVALID_ADMIN_VALUES');
  const values=[user.id,user.email||'',profile.display_name||previous[2]||'听友',profile.handle||previous[3]||'',profile.avatar_path||'',status,tier,until,previous[8]||profile.created_at||new Date().toISOString(),new Date().toISOString(),'member'];
  const target=index>0?index+1:Math.max(2,sheet.getLastRow()+1);
  if(index>0){sheet.getRange(target,1,1,5).setValues([values.slice(0,5).map(echoText_)]);sheet.getRange(target,9,1,2).setValues([values.slice(8,10).map(echoText_)])}
  else sheet.getRange(target,1,1,values.length).setValues([values.map(echoText_)]);
  const controls=sheet.getRange(target,6,1,3).getValues()[0],currentUntil=controls[2] instanceof Date?controls[2].toISOString():String(controls[2]||'');
  return{user_id:user.id,account_status:String(controls[0]||'active'),tier:String(controls[1]||'free'),premium_until:currentUntil||null};
 }finally{lock.releaseLock()}
}
function installEchoStatusTrigger(){
 const p=PropertiesService.getScriptProperties();if(!p.getProperty('ECHO_ADMIN_HOOK_KEY'))throw Error('Run configureEcho first');
 for(const trigger of ScriptApp.getProjectTriggers())if(trigger.getHandlerFunction()==='pushEchoAccountEdit')ScriptApp.deleteTrigger(trigger);
 ScriptApp.newTrigger('pushEchoAccountEdit').forSpreadsheet(echoBook_()).onEdit().create();
}
function pushEchoAccountEdit(event){
 if(PropertiesService.getScriptProperties().getProperty('ECHO_DATA_MODE')==='sheets')return;
 const range=event?.range;if(!range||range.getSheet().getName()!=='Users'||range.getRow()<2||range.getLastColumn()<6||range.getColumn()>8)return;
 const p=PropertiesService.getScriptProperties(),config=echoConfig_();
 for(let row=range.getRow();row<=range.getLastRow();row++){
  const values=range.getSheet().getRange(row,1,1,10).getValues()[0],until=values[7] instanceof Date?values[7].toISOString():String(values[7]||'');
  const payload={action:'admin_update',account:{user_id:String(values[0]),account_status:String(values[5]),tier:String(values[6]),premium_until:until||null}};
  const response=UrlFetchApp.fetch(config.url+'/functions/v1/account-admin',{method:'post',contentType:'application/json',headers:{apikey:config.key,'x-echo-admin-key':p.getProperty('ECHO_ADMIN_HOOK_KEY')},payload:JSON.stringify(payload),muteHttpExceptions:true});
  echoBook_().getSheetByName('Events').appendRow([new Date().toISOString(),echoText_(values[0]),'account_update',response.getResponseCode()===200?'ok':'failed']);
 }
}
function echoEscape_(value){return String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function sendWelcomeToSelectedUser(){
 const book=echoBook_(),active=book.getActiveRange();if(active.getSheet().getName()!=='Users'||active.getRow()<2)throw Error('Select a user row in Users first');
 const user=active.getSheet().getRange(active.getRow(),1,1,10).getValues()[0],templates=book.getSheetByName('EmailTemplates').getDataRange().getValues(),template=templates.find((row,i)=>i>0&&row[0]==='welcome');
 if(!template||template[4]!==true)throw Error('Enable the welcome template before sending');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(user[1])))throw Error('Invalid email');
 const ui=SpreadsheetApp.getUi();if(ui.alert('发送欢迎邮件','收件人：'+user[1],ui.ButtonSet.YES_NO)!==ui.Button.YES)return;
 const subject=String(template[1]).replace(/[\r\n]/g,' '),html=String(template[2]).replace(/\{\{display_name\}\}/g,echoEscape_(user[2]));
 const message={to:String(user[1]),subject,body:'欢迎使用 Echo',htmlBody:html,name:'Echo'};
 if(template[3]){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(template[3])))throw Error('Invalid reply address');message.replyTo=String(template[3])}
 MailApp.sendEmail(message);book.getSheetByName('Events').appendRow([new Date().toISOString(),echoText_(user[0]),'welcome_email','sent']);
}

const ECHO_TABLES={
 Users:['user_id','email','display_name','handle','avatar_path','account_status','tier','premium_until','created_at','synced_at','role'],
 Auth:['user_id','email','password_hash','email_verified','created_at','password_changed_at','failed_attempts','locked_until','last_mail_at'],
 Sessions:['token_hash','user_id','created_at','expires_at'],
 Recovery:['token_hash','user_id','purpose','created_at','expires_at'],
 Likes:['user_id','track_id','track','created_at'],
 Playlists:['id','user_id','name','cover','visibility','created_at','items','updated_at'],
 Friendships:['id','requester_id','addressee_id','status','created_at'],
 Messages:['id','sender_id','recipient_id','body','track','created_at'],
 Posts:['id','user_id','body','track','created_at'],
 PostComments:['id','post_id','user_id','body','created_at'],
 PostReactions:['id','post_id','user_id','created_at'],
 Danmaku:['id','track_id','user_id','body','position','created_at'],
 Rooms:['id','host_id','name','members','track','position','playing','revision','updated_at','created_at','expires_at','closed'],
 RoomMessages:['id','room_id','user_id','body','created_at'],
 RedemptionCodes:['id','code_hash','code_hint','label','days','max_uses','expires_at','enabled','created_by','created_at'],
 Redemptions:['id','code_id','user_id','days','previous_tier','previous_until','premium_until','state','created_at','applied_at']
};
const ECHO_JSON_COLUMNS={Likes:['track'],Playlists:['items'],Messages:['track'],Posts:['track'],Rooms:['members','track']};
function echoFailure_(code){throw Error(code)}
function echoTime_(){return new Date().toISOString()}
function echoId_(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)}
function echoFields_(body,allowed){if(Object.keys(body).some(key=>!['action','session_token',...allowed].includes(key)))echoFailure_('INVALID_REQUEST')}
function echoTable_(name,cache){
 if(cache[name])return cache[name];const headers=ECHO_TABLES[name],sheet=echoBook_().getSheetByName(name);if(!sheet||!headers)echoFailure_('SCHEMA_NOT_READY');
 const values=sheet.getDataRange().getValues();if(headers.some((key,i)=>values[0]?.[i]!==key))echoFailure_('SCHEMA_NOT_READY');
 const json=ECHO_JSON_COLUMNS[name]||[],decode=(value,key)=>{if(json.includes(key))return value?JSON.parse(String(value)):null;if(value instanceof Date)return value.toISOString();if(typeof value==='string'&&value.startsWith("'")&&/^\s*[=+@-]/.test(value.slice(1)))return value.slice(1);return value};
 const rows=values.slice(1).map((row,i)=>({_row:i+2,...Object.fromEntries(headers.map((key,j)=>[key,decode(row[j]??'',key)]))})).filter(row=>row[headers[0]]!=='');
 const encode=row=>headers.map(key=>{const value=row[key];if(json.includes(key))return value==null?'':JSON.stringify(value);if(typeof value==='boolean'||typeof value==='number')return value;if(value==null)return '';const text=String(value);if(text.length>45000)echoFailure_('VALUE_TOO_LARGE');return /^\s*[=+@-]/.test(text)?"'"+text:text});
 const table={rows,put(row){const data=encode(row);if(!row._row){row._row=Math.max(2,sheet.getLastRow()+1);rows.push(row);if(sheet.getMaxRows&&row._row>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),500);sheet.getRange(row._row,1,1,headers.length).setValues([data])}else if(name==='Users'){sheet.getRange(row._row,1,1,5).setValues([data.slice(0,5)]);sheet.getRange(row._row,9,1,2).setValues([data.slice(8,10)])}else sheet.getRange(row._row,1,1,headers.length).setValues([data]);return row},remove(predicate){for(const row of rows.filter(predicate).sort((a,b)=>b._row-a._row)){sheet.deleteRow(row._row);const index=rows.indexOf(row);rows.splice(index,1);for(const remaining of rows)if(remaining._row>row._row)remaining._row--}}};cache[name]=table;return table;
}
function installEchoSheets(){
 const book=echoBook_(),p=PropertiesService.getScriptProperties();
 for(const [name,headers]of Object.entries(ECHO_TABLES)){let sheet=book.getSheetByName(name);if(!sheet)sheet=book.insertSheet(name);const existing=sheet.getLastRow()?sheet.getRange(1,1,1,headers.length).getValues()[0]:[];if(existing.some((value,i)=>value&&value!==headers[i]))throw Error('Unexpected headers in '+name);sheet.getRange(1,1,1,headers.length).setValues([headers]);sheet.setFrozenRows(1)}
 if(!p.getProperty('ECHO_PASSWORD_PEPPER'))p.setProperty('ECHO_PASSWORD_PEPPER',Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid());
 if(!p.getProperty('ECHO_DATA_MODE'))p.setProperty('ECHO_DATA_MODE','staged');
 if(!p.getProperty('ECHO_DUMMY_HASH'))echoDummyHash_();p.setProperty('ECHO_SHEETS_VERSION','5');try{echoAvatarCall_({action:'sign',paths:[]});p.setProperty('ECHO_AVATAR_READY','true')}catch{p.setProperty('ECHO_AVATAR_READY','false');throw Error('Avatar connection failed. Check that ECHO_ADMIN_HOOK_KEY matches the existing Supabase secret; do not share the key in chat.')}
}
function echoSheetsHealth_(){const p=PropertiesService.getScriptProperties();let schemaReady=false;try{const cache={};for(const name of Object.keys(ECHO_TABLES))echoTable_(name,cache);schemaReady=true}catch{}return{version:'5',schemaReady,passwordReady:Boolean(p.getProperty('ECHO_PASSWORD_PEPPER')),avatarReady:p.getProperty('ECHO_AVATAR_READY')==='true',mode:p.getProperty('ECHO_DATA_MODE')||'staged',capabilities:['sheet_data','password_auth','avatar_storage',...(schemaReady?['feed','danmaku','rooms','member_admin','redemption']:[])]}}
function activateEchoSheets(){const health=echoSheetsHealth_();if(!health.schemaReady||!health.passwordReady||!health.avatarReady)throw Error('Run installEchoSheets and import migration data first');const cache={},users=echoTable_('Users',cache).rows,auth=echoTable_('Auth',cache).rows;if(!users.length||users.some(user=>!auth.some(row=>row.user_id===user.user_id&&String(row.email).toLowerCase()===String(user.email).toLowerCase()))||!users.some(user=>user.role==='admin'))throw Error('Migration users or administrator missing');PropertiesService.getScriptProperties().setProperty('ECHO_DATA_MODE','sheets')}
function echoProfile_(row){return{id:row.user_id,handle:row.handle,display_name:row.display_name,avatar_path:row.avatar_path||null,created_at:row.created_at}}
function echoAccount_(row){const expiry=row.premium_until?new Date(row.premium_until).toISOString():null;return{user_id:row.user_id,account_status:row.account_status,tier:row.tier==='premium'&&(!expiry||Date.parse(expiry)>Date.now())?'premium':'free',premium_until:expiry}}
function echoSessionUser_(body,cache,allowInactive){
 if(typeof body.session_token!=='string'||body.session_token.length<32||body.session_token.length>300)echoFailure_('UNAUTHORIZED');
 const token=echoDigest_(body.session_token),session=echoTable_('Sessions',cache).rows.find(row=>row.token_hash===token&&Date.parse(row.expires_at)>Date.now());if(!session)echoFailure_('UNAUTHORIZED');
 const auth=echoTable_('Auth',cache).rows.find(row=>row.user_id===session.user_id);if(!auth||auth.email_verified!==true||(auth.password_changed_at&&Date.parse(session.created_at)<Date.parse(auth.password_changed_at)))echoFailure_('UNAUTHORIZED');const user=echoTable_('Users',cache).rows.find(row=>row.user_id===session.user_id);if(!user)echoFailure_('UNAUTHORIZED');if(!allowInactive&&user.account_status!=='active')echoFailure_('ACCOUNT_INACTIVE');return user;
}
function echoFriend_(cache,a,b){return echoTable_('Friendships',cache).rows.find(row=>row.status==='accepted'&&((row.requester_id===a&&row.addressee_id===b)||(row.requester_id===b&&row.addressee_id===a)))}
function echoTrack_(track){if(!track||typeof track!=='object'||Array.isArray(track)||typeof track.id!=='string'||track.id.length>100||typeof track.title!=='string'||!track.title.trim()||track.title.length>300||JSON.stringify(track).length>8000)echoFailure_('INVALID_TRACK');const copy=JSON.parse(JSON.stringify(track));for(const key of ['file','src','avatar_url','session_token','access_token'])delete copy[key];return copy}
function echoPublicRow_(row){const copy={...row};delete copy._row;return copy}
function echoDataAction_(body,cache){
 const user=echoSessionUser_(body,cache,['account.get','profile.get','auth.session','auth.signout'].includes(body.action)),uid=user.user_id,users=echoTable_('Users',cache),action=body.action;
 if(action==='account.get'){echoFields_(body,[]);return{account:echoAccount_(user),isAdmin:user.role==='admin'&&user.account_status==='active'}}
 if(action==='profile.get'){echoFields_(body,[]);return{profile:echoProfile_(user)}}
 if(action==='profile.update'){echoFields_(body,['handle','display_name']);echoUpdateName_(body,user,users);user.synced_at=echoTime_();users.put(user);return{profile:echoProfile_(user)}}
 if(action==='library.get'){echoFields_(body,[]);return{likes:echoTable_('Likes',cache).rows.filter(row=>row.user_id===uid).map(echoPublicRow_),playlists:echoTable_('Playlists',cache).rows.filter(row=>row.user_id===uid).map(echoPlaylist_)}}
 if(action==='likes.set'){echoFields_(body,['track','liked']);if(typeof body.liked!=='boolean')echoFailure_('INVALID_REQUEST');const track=echoTrack_(body.track),table=echoTable_('Likes',cache),row=table.rows.find(item=>item.user_id===uid&&item.track_id===track.id);if(body.liked)table.put(Object.assign(row||{user_id:uid,track_id:track.id,created_at:echoTime_()},{track}));else table.remove(item=>item===row);return{}}
 if(action==='playlist.save'){echoFields_(body,['id','name','cover','visibility','tracks']);if(typeof body.id!=='string'||!body.id||body.id.length>100||typeof body.name!=='string'||!body.name.trim()||body.name.length>100||!['private','friends'].includes(body.visibility)||typeof body.cover!=='string'||body.cover.length>2000||!Array.isArray(body.tracks)||body.tracks.length>500)echoFailure_('INVALID_PLAYLIST');const tracks=body.tracks.map(echoTrack_);if(new Set(tracks.map(track=>track.id)).size!==tracks.length||JSON.stringify(tracks).length>43000)echoFailure_('INVALID_PLAYLIST');const table=echoTable_('Playlists',cache),row=table.rows.find(item=>item.id===body.id);if(row&&row.user_id!==uid)echoFailure_('FORBIDDEN');table.put(Object.assign(row||{id:body.id,user_id:uid,created_at:echoTime_()},{name:body.name.trim(),cover:body.cover,visibility:body.visibility,items:tracks,updated_at:echoTime_()}));return{}}
 if(action==='playlist.delete'){echoFields_(body,['id']);echoTable_('Playlists',cache).remove(row=>row.id===body.id&&row.user_id===uid);return{}}
 if(action==='playlist.shared'){echoFields_(body,['person_id']);if(!echoFriend_(cache,uid,body.person_id))echoFailure_('FRIENDS_REQUIRED');return{playlists:echoTable_('Playlists',cache).rows.filter(row=>row.user_id===body.person_id&&row.visibility==='friends').map(echoPlaylist_)}}
 if(action==='people.search'){echoFields_(body,['query']);if(typeof body.query!=='string'||!/^[a-z0-9_]{3,24}$/.test(body.query))echoFailure_('INVALID_QUERY');return{people:users.rows.filter(row=>row.user_id!==uid&&row.account_status==='active'&&row.handle.startsWith(body.query)).slice(0,20).map(echoProfile_)}}
 if(action==='friends.list'){echoFields_(body,[]);return{friends:echoTable_('Friendships',cache).rows.filter(row=>row.requester_id===uid||row.addressee_id===uid).map(row=>({...echoPublicRow_(row),person:echoProfile_(users.rows.find(person=>person.user_id===(row.requester_id===uid?row.addressee_id:row.requester_id))||{})}))}}
 if(action==='friends.request'){echoFields_(body,['person_id']);if(!echoId_(body.person_id)||body.person_id===uid||!users.rows.some(row=>row.user_id===body.person_id&&row.account_status==='active'))echoFailure_('INVALID_USER');const table=echoTable_('Friendships',cache);if(table.rows.some(row=>[uid,body.person_id].includes(row.requester_id)&&[uid,body.person_id].includes(row.addressee_id)))echoFailure_('FRIENDSHIP_EXISTS');table.put({id:Utilities.getUuid(),requester_id:uid,addressee_id:body.person_id,status:'pending',created_at:echoTime_()});return{}}
 if(action==='friends.accept'||action==='friends.remove'){echoFields_(body,['id']);const table=echoTable_('Friendships',cache),row=table.rows.find(item=>item.id===body.id);if(!row||!(action==='friends.accept'?row.addressee_id===uid:row.addressee_id===uid||row.requester_id===uid))echoFailure_('FORBIDDEN');if(action==='friends.accept'){row.status='accepted';table.put(row)}else table.remove(item=>item===row);return{}}
 if(action==='messages.read'||action==='messages.send'){const person=body.person_id;if(!echoId_(person)||!echoFriend_(cache,uid,person))echoFailure_('FRIENDS_REQUIRED');const table=echoTable_('Messages',cache);if(action==='messages.read'){echoFields_(body,['person_id','cursor']);const cursor=body.cursor;if(cursor&&(!echoId_(cursor.id)||!Number.isFinite(Date.parse(cursor.created_at))))echoFailure_('INVALID_CURSOR');return{messages:table.rows.filter(row=>((row.sender_id===uid&&row.recipient_id===person)||(row.sender_id===person&&row.recipient_id===uid))&&(!cursor||echoMessageOrder_(row,cursor)<0)).sort(echoMessageOrder_).reverse().slice(0,40).reverse().map(echoPublicRow_)}}echoFields_(body,['person_id','id','body','track']);if(!echoId_(body.id)||typeof body.body!=='string'||body.body.length>2000||(!body.body.trim()&&!body.track))echoFailure_('INVALID_MESSAGE');const track=body.track?echoTrack_(body.track):null,row=table.rows.find(item=>item.id===body.id);if(row){if(row.sender_id!==uid||row.recipient_id!==person||row.body!==body.body.trim()||JSON.stringify(row.track)!==JSON.stringify(track))echoFailure_('MESSAGE_CONFLICT');return{message:echoPublicRow_(row)}}const message={id:body.id,sender_id:uid,recipient_id:person,body:body.body.trim(),track,created_at:echoTime_()};table.put(message);return{message:echoPublicRow_(message)}}
 if(['social.','danmaku.','rooms.'].some(prefix=>action.startsWith(prefix)))return echoCommunityAction_(body,user,cache);
 if(action.startsWith('redemption.'))return echoRedemptionAction_(body,user,cache);
 if(action.startsWith('avatar.')||action.startsWith('admin.'))return echoAvatarAction_(body,user,cache);
 echoFailure_('INVALID_REQUEST');
}
function echoUpdateName_(body,user,users){if(typeof body.handle!=='string'||!/^[a-z0-9_]{3,24}$/.test(body.handle)||typeof body.display_name!=='string'||!body.display_name.trim()||body.display_name.length>40)echoFailure_('INVALID_PROFILE');if(users.rows.some(row=>row.user_id!==user.user_id&&row.handle===body.handle))echoFailure_('HANDLE_TAKEN');user.handle=body.handle;user.display_name=body.display_name.trim()}
function echoPlaylist_(row){const copy=echoPublicRow_(row);copy.playlist_items=(row.items||[]).map((track,position)=>({playlist_id:row.id,track_id:track.id,track,position}));delete copy.items;return copy}
function echoMessageOrder_(a,b){const stamp=value=>new Date(value).toISOString().slice(0,19)+'.'+(String(value).match(/\.(\d+)/)?.[1]||'').padEnd(6,'0').slice(0,6);return stamp(a.created_at).localeCompare(stamp(b.created_at))||String(a.id).localeCompare(String(b.id))}
function echoSheetsPost_(body){const lock=LockService.getScriptLock();lock.waitLock(10000);try{if(PropertiesService.getScriptProperties().getProperty('ECHO_DATA_MODE')!=='sheets')echoFailure_('MIGRATION_NOT_ACTIVE');const cache={};return{ok:true,version:'5',...(body.action.startsWith('auth.')?echoAuthAction_(body,cache):echoDataAction_(body,cache))}}catch(error){const allowed=['UNAUTHORIZED','INVALID_REQUEST','INVALID_EMAIL','INVALID_PASSWORD','INVALID_CREDENTIALS','EMAIL_NOT_VERIFIED','RESET_REQUIRED','TOKEN_INVALID','RATE_LIMITED','ACCOUNT_INACTIVE','MIGRATION_NOT_ACTIVE','SCHEMA_NOT_READY','FORBIDDEN','INVALID_PROFILE','HANDLE_TAKEN','FRIENDS_REQUIRED','FRIENDSHIP_EXISTS','INVALID_USER','INVALID_QUERY','INVALID_PLAYLIST','INVALID_MESSAGE','INVALID_CURSOR','MESSAGE_CONFLICT','INVALID_TRACK','INVALID_AVATAR','AVATAR_STORAGE_UNAVAILABLE','VALUE_TOO_LARGE','ADMIN_REQUIRED','USER_NOT_FOUND','CURRENT_PASSWORD_REQUIRED','EMAIL_LIMIT','INVALID_SOCIAL_CONTENT','CONTENT_CONFLICT','SOCIAL_LIMIT','ROOM_UNAVAILABLE','ROOM_STALE','EMAIL_TAKEN','LAST_ADMIN','USER_CHANGED','INVALID_MEMBERSHIP','INVALID_CODE','INVALID_CODE_SETTINGS','CODE_UNAVAILABLE','MEMBERSHIP_NO_EXPIRY','REDEMPTION_CHANGED'];return{ok:false,error:allowed.includes(error.message)?error.message:'SERVICE_UNAVAILABLE'}}finally{lock.releaseLock()}}

function echoDigest_(text){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8)).replace(/=+$/,'')}
function echoRandom_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'')}
function echoEmail_(value){if(typeof value!=='string')echoFailure_('INVALID_EMAIL');const email=value.trim().toLowerCase();if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))echoFailure_('INVALID_EMAIL');return email}
function echoPasswordInput_(value){if(typeof value!=='string'||value.length<12||value.length>256)echoFailure_('INVALID_PASSWORD');const pepper=PropertiesService.getScriptProperties().getProperty('ECHO_PASSWORD_PEPPER');if(!pepper||pepper.length<64)echoFailure_('SCHEMA_NOT_READY');return Utilities.base64Encode(Utilities.computeHmacSha256Signature(value,pepper,Utilities.Charset.UTF_8))}
function echoPasswordHash_(password){EchoBcrypt.setRandomFallback(length=>{const bytes=[];while(bytes.length<length){const hex=Utilities.getUuid().replace(/-/g,'');for(let i=0;i<hex.length;i+=2)bytes.push(parseInt(hex.slice(i,i+2),16))}return bytes.slice(0,length)});return EchoBcrypt.hashSync(echoPasswordInput_(password),12)}
function echoPasswordMatches_(password,hash){if(typeof password!=='string'||password.length<12||password.length>256||typeof hash!=='string'||!/^\$2[aby]\$12\$/.test(hash))return false;return EchoBcrypt.compareSync(echoPasswordInput_(password),hash)}
function echoThrottle_(name,max,period){const properties=PropertiesService.getScriptProperties(),key='ECHO_RATE_'+echoDigest_(name),now=Date.now();let value;try{value=JSON.parse(properties.getProperty(key)||'null')}catch{}if(!value||value.until<=now)value={count:0,until:now+period};value.count++;properties.setProperty(key,JSON.stringify(value));if(value.count>max)echoFailure_('RATE_LIMITED')}
function echoPruneRates_(){const p=PropertiesService.getScriptProperties(),all=p.getProperties();for(const [key,value]of Object.entries(all))if(key.startsWith('ECHO_RATE_')){try{if(JSON.parse(value).until<Date.now())p.deleteProperty(key)}catch{}}}
function echoIssueSession_(auth,cache){const token=echoRandom_(),now=echoTime_(),table=echoTable_('Sessions',cache);table.remove(row=>Date.parse(row.expires_at)<=Date.now());const sessions=table.rows.filter(row=>row.user_id===auth.user_id).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));for(const row of sessions.slice(0,Math.max(0,sessions.length-4)))table.remove(item=>item===row);const expires=new Date(Date.now()+7*86400000).toISOString();table.put({token_hash:echoDigest_(token),user_id:auth.user_id,created_at:now,expires_at:expires});return{session:{token,expires_at:expires,user:{id:auth.user_id,email:auth.email}}}}
function echoResetURL_(redirect,purpose,token){const allowed=['https://jianming0718.github.io/echo-music/','https://echo-music-free-player.stablepeace1.chatgpt.site/'];const base=allowed.includes(redirect)?redirect:allowed[0];return base+'#echo-auth='+encodeURIComponent(purpose)+'&token='+encodeURIComponent(token)}
function echoSendRecovery_(auth,purpose,redirect,cache){
 const now=Date.now();if(auth.last_mail_at&&now-Date.parse(auth.last_mail_at)<60000)return;
 if(MailApp.getRemainingDailyQuota()<1)echoFailure_('EMAIL_LIMIT');
 const table=echoTable_('Recovery',cache),token=echoRandom_();table.remove(row=>row.user_id===auth.user_id&&row.purpose===purpose||Date.parse(row.expires_at)<=now);const record={token_hash:echoDigest_(token),user_id:auth.user_id,purpose,created_at:echoTime_(),expires_at:new Date(now+(purpose==='verify'?24*60:30)*60000).toISOString()};table.put(record);
 const link=echoResetURL_(redirect,purpose,token),subject=purpose==='verify'?'确认你的 Echo 邮箱 / Verify your Echo email':'重设 Echo 密码 / Reset your Echo password',body=(purpose==='verify'?'打开链接确认邮箱，然后使用邮箱和密码登录。\nOpen this link to verify your email, then sign in with your password.':'打开链接设置新密码。链接有效期为 30 分钟，只能使用一次。\nOpen this link to set a new password. It expires in 30 minutes and works once.')+'\n\n'+link+'\n\n如果不是你发起的请求，请忽略这封邮件。\nIf you did not request this, ignore this email.';
 try{const message={to:auth.email,subject,body,name:'Echo'},templates=echoBook_().getSheetByName('EmailTemplates')?.getDataRange().getValues()||[],template=templates.find((row,i)=>i>0&&row[0]===(purpose==='verify'?'verify_email':'reset_password'));if(template?.[4]===true){message.subject=String(template[1]||subject).replace(/[\r\n]/g,' ').slice(0,200);if(template[2])message.htmlBody=String(template[2]).replace(/\{\{action_url\}\}/g,echoEscape_(link)).replace(/\{\{email\}\}/g,echoEscape_(auth.email));if(template[3]){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(template[3])))echoFailure_('EMAIL_LIMIT');message.replyTo=String(template[3])}}MailApp.sendEmail(message)}catch{table.remove(row=>row===record);echoFailure_('EMAIL_LIMIT')}
 auth.last_mail_at=echoTime_();echoTable_('Auth',cache).put(auth);
}
function echoRecovery_(body,purpose,cache){if(typeof body.token!=='string'||body.token.length<32||body.token.length>300)echoFailure_('TOKEN_INVALID');const row=echoTable_('Recovery',cache).rows.find(row=>row.token_hash===echoDigest_(body.token)&&row.purpose===purpose&&Date.parse(row.expires_at)>Date.now());if(!row)echoFailure_('TOKEN_INVALID');const auth=echoTable_('Auth',cache).rows.find(item=>item.user_id===row.user_id);if(!auth)echoFailure_('TOKEN_INVALID');return{row,auth}}
function echoAuthAction_(body,cache){
 const action=body.action;
 if(['auth.signin','auth.register','auth.reset.request'].includes(action)){
  echoFields_(body,action==='auth.reset.request'?['email','redirect']:['email','password','redirect']);const email=echoEmail_(body.email);echoPruneRates_();echoThrottle_('global-auth',80,60000);const table=echoTable_('Auth',cache),auth=table.rows.find(row=>String(row.email).toLowerCase()===email);
  if(action==='auth.signin'){
   echoThrottle_('signin:'+email,12,900000);if(auth?.locked_until&&Date.parse(auth.locked_until)>Date.now())echoFailure_('INVALID_CREDENTIALS');
   if(!auth||!auth.password_hash){echoPasswordMatches_(body.password,PropertiesService.getScriptProperties().getProperty('ECHO_DUMMY_HASH')||echoDummyHash_());echoFailure_('INVALID_CREDENTIALS')}
   if(!echoPasswordMatches_(body.password,auth.password_hash)){auth.failed_attempts=(Number(auth.failed_attempts)||0)+1;if(auth.failed_attempts>=8){auth.locked_until=new Date(Date.now()+900000).toISOString();auth.failed_attempts=0}table.put(auth);echoFailure_('INVALID_CREDENTIALS')}
   if(auth.email_verified!==true)echoFailure_('EMAIL_NOT_VERIFIED');const user=echoTable_('Users',cache).rows.find(row=>row.user_id===auth.user_id);if(!user)echoFailure_('INVALID_CREDENTIALS');auth.failed_attempts=0;auth.locked_until='';table.put(auth);return echoIssueSession_(auth,cache);
  }
  echoThrottle_('global-mail',80,86400000);echoThrottle_('mail:'+email,5,3600000);
  if(action==='auth.reset.request'){if(auth)echoSendRecovery_(auth,'reset',body.redirect,cache);return{}}
  const passwordHash=echoPasswordHash_(body.password);
  if(auth){echoEnsureRegistrationProfile_(auth,cache);if(auth.email_verified!==true)echoSendRecovery_(auth,'verify',body.redirect,cache);return{session:null}}
  const id=Utilities.getUuid(),now=echoTime_(),newAuth={user_id:id,email,password_hash:passwordHash,email_verified:false,created_at:now,password_changed_at:now,failed_attempts:0,locked_until:'',last_mail_at:''};
  table.put(newAuth);echoTable_('Users',cache).put({user_id:id,email,display_name:'听友',handle:'u_'+id.replace(/-/g,'').slice(0,12),avatar_path:'',account_status:'active',tier:'free',premium_until:'',created_at:now,synced_at:now,role:'member'});echoSendRecovery_(newAuth,'verify',body.redirect,cache);return{session:null};
 }
 if(action==='auth.verify'){echoFields_(body,['token']);const {row,auth}=echoRecovery_(body,'verify',cache);echoTable_('Recovery',cache).remove(item=>item===row);auth.email_verified=true;echoTable_('Auth',cache).put(auth);return{verified:true}}
 if(action==='auth.reset.complete'){
  echoFields_(body,['token','password']);const {row,auth}=echoRecovery_(body,'reset',cache);const hash=echoPasswordHash_(body.password);echoTable_('Recovery',cache).remove(item=>item.user_id===auth.user_id);echoTable_('Sessions',cache).remove(item=>item.user_id===auth.user_id);auth.password_hash=hash;auth.password_changed_at=echoTime_();auth.email_verified=true;auth.failed_attempts=0;auth.locked_until='';echoTable_('Auth',cache).put(auth);return{reset:true};
 }
 const user=echoSessionUser_(body,cache,['auth.session','auth.signout','auth.password','auth.delete'].includes(action)),uid=user.user_id;
 if(action==='auth.session'){echoFields_(body,[]);const auth=echoTable_('Auth',cache).rows.find(row=>row.user_id===uid);return{user:{id:uid,email:auth.email},profile:echoProfile_(user),account:echoAccount_(user),isAdmin:user.role==='admin'&&user.account_status==='active'}}
 if(action==='auth.signout'){echoFields_(body,[]);echoTable_('Sessions',cache).remove(row=>row.token_hash===echoDigest_(body.session_token));return{}}
 if(action==='auth.password'){echoFields_(body,['password','current_password']);const auth=echoTable_('Auth',cache).rows.find(row=>row.user_id===uid);echoThrottle_('password:'+uid,8,900000);if(!echoPasswordMatches_(body.current_password,auth.password_hash))echoFailure_('CURRENT_PASSWORD_REQUIRED');const hash=echoPasswordHash_(body.password);const now=echoTime_(),current=echoTable_('Sessions',cache).rows.find(row=>row.token_hash===echoDigest_(body.session_token));current.created_at=now;echoTable_('Sessions',cache).put(current);auth.password_hash=hash;auth.password_changed_at=now;echoTable_('Auth',cache).put(auth);echoTable_('Sessions',cache).remove(row=>row.user_id===uid&&row.token_hash!==echoDigest_(body.session_token));return{}}
 if(action==='auth.delete'){echoFields_(body,[]);if(user.role==='admin'&&!echoTable_('Users',cache).rows.some(row=>row.user_id!==uid&&row.role==='admin'&&row.account_status==='active'))echoFailure_('FORBIDDEN');echoAvatarCall_({action:'purge',user_id:uid});echoCommunityDeleteUser_(cache,uid);echoRedemptionDeleteUser_(cache,uid);for(const name of ['Sessions','Recovery','Auth','Likes','Playlists'])echoTable_(name,cache).remove(row=>row.user_id===uid);echoTable_('Friendships',cache).remove(row=>row.requester_id===uid||row.addressee_id===uid);echoTable_('Messages',cache).remove(row=>row.sender_id===uid||row.recipient_id===uid);echoTable_('Users',cache).remove(row=>row.user_id===uid);return{deleted:true}}
 echoFailure_('INVALID_REQUEST');
}
function echoDummyHash_(){const p=PropertiesService.getScriptProperties(),hash=echoPasswordHash_(echoRandom_());p.setProperty('ECHO_DUMMY_HASH',hash);return hash}

function echoEnsureRegistrationProfile_(auth,cache){const users=echoTable_('Users',cache);if(!users.rows.some(row=>row.user_id===auth.user_id))users.put({user_id:auth.user_id,email:auth.email,display_name:'听友',handle:'u_'+auth.user_id.replace(/-/g,'').slice(0,20),avatar_path:'',account_status:'active',tier:'free',premium_until:'',created_at:auth.created_at,synced_at:echoTime_(),role:'member'})}

function echoAvatarPath_(value){return typeof value==='string'&&/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i.test(value)}
function echoAvatarCall_(body){const p=PropertiesService.getScriptProperties(),key=p.getProperty('ECHO_ADMIN_HOOK_KEY'),config=echoConfig_();if(!key||key.length<32)echoFailure_('AVATAR_STORAGE_UNAVAILABLE');const response=UrlFetchApp.fetch(config.url+'/functions/v1/avatar-storage',{method:'post',contentType:'application/json',headers:{apikey:config.key,'x-echo-admin-key':key},payload:JSON.stringify(body),muteHttpExceptions:true});let data;try{data=JSON.parse(response.getContentText())}catch{}if(response.getResponseCode()!==200||!data?.ok)echoFailure_('AVATAR_STORAGE_UNAVAILABLE');return data}
function echoAvatarAction_(body,user,cache){
 const users=echoTable_('Users',cache),uid=user.user_id,action=body.action;
 if(action==='avatar.sign'){echoFields_(body,['paths']);if(!Array.isArray(body.paths)||body.paths.length>50||body.paths.some(path=>!echoAvatarPath_(path)||!users.rows.some(row=>row.avatar_path===path)))echoFailure_('INVALID_AVATAR');return echoAvatarCall_({action:'sign',paths:[...new Set(body.paths)]})}
 if(action==='avatar.upload'){echoFields_(body,['image']);if(typeof body.image!=='string'||body.image.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.image))echoFailure_('INVALID_AVATAR');const path=uid+'/'+Utilities.getUuid()+'.jpg';echoAvatarCall_({action:'upload',path,image:body.image});const old=user.avatar_path;user.avatar_path=path;user.synced_at=echoTime_();users.put(user);if(old)try{echoAvatarCall_({action:'remove',path:old})}catch{}return{profile:echoProfile_(user)}}
 if(action==='avatar.remove'){echoFields_(body,[]);const old=user.avatar_path;user.avatar_path='';user.synced_at=echoTime_();users.put(user);if(old)try{echoAvatarCall_({action:'remove',path:old})}catch{}return{profile:echoProfile_(user)}}
 return echoMemberAdminAction_(body,user,cache);
}

function echoSocialAudience_(cache, user) {
 const users=echoTable_('Users',cache).rows, ids=new Set([user.user_id]);
 for(const row of echoTable_('Friendships',cache).rows) if(row.status==='accepted') {
  if(row.requester_id===user.user_id) ids.add(row.addressee_id);
  if(row.addressee_id===user.user_id) ids.add(row.requester_id);
 }
 return new Set(users.filter(row=>ids.has(row.user_id)&&row.account_status==='active').map(row=>row.user_id));
}
function echoSocialText_(value,max,empty) {
 if(typeof value!=='string'||value.length>max||(!empty&&!value.trim())) echoFailure_('INVALID_SOCIAL_CONTENT');
 return value.trim();
}
function echoSocialTrack_(value) {
 const track=echoTrack_(value);
 if(!['sanctuary','hiraeth','childhood','moonlight'].includes(track.id)&&!/^youtube-[A-Za-z0-9_-]{11}$/.test(track.id)&&!/^audius-[a-zA-Z0-9]+$/.test(track.id)) echoFailure_('INVALID_TRACK');
 return track;
}
function echoSocialPerson_(cache,id) {
 const row=echoTable_('Users',cache).rows.find(user=>user.user_id===id);
 return row?echoProfile_(row):null;
}
function echoSocialPage_(rows,cursor,limit) {
 if(cursor&&(!echoId_(cursor.id)||!Number.isFinite(Date.parse(cursor.created_at)))) echoFailure_('INVALID_CURSOR');
 const found=rows.filter(row=>!cursor||echoMessageOrder_(row,cursor)<0).sort(echoMessageOrder_).reverse();
 return {items:found.slice(0,limit),hasMore:found.length>limit};
}
function echoSocialExisting_(table,id,uid,fields) {
 if(!echoId_(id))echoFailure_('INVALID_REQUEST');
 const row=table.rows.find(item=>item.id===id);
 if(row&&(row.user_id!==uid||Object.entries(fields).some(([key,value])=>JSON.stringify(row[key])!==JSON.stringify(value)))) echoFailure_('CONTENT_CONFLICT');
 return row;
}
function echoSocialLimit_(table,uid,max) {
 if(table.rows.filter(row=>row.user_id===uid).length>=max)echoFailure_('SOCIAL_LIMIT');
 echoThrottle_('social-write:'+uid,45,60000);
}
function echoDeletePost_(cache,id) {
 echoTable_('PostComments',cache).remove(row=>row.post_id===id);
 echoTable_('PostReactions',cache).remove(row=>row.post_id===id);
 echoTable_('Posts',cache).remove(row=>row.id===id);
}
function echoRoomAccess_(cache,uid,id) {
 const room=echoTable_('Rooms',cache).rows.find(row=>row.id===id),host=room&&echoTable_('Users',cache).rows.find(row=>row.user_id===room.host_id);
 if(!room||room.closed||Date.parse(room.expires_at)<=Date.now()||host?.account_status!=='active')echoFailure_('ROOM_UNAVAILABLE');
 if(room.host_id!==uid&&(!(room.members||[]).includes(uid)||!echoFriend_(cache,uid,room.host_id)))echoFailure_('FORBIDDEN');
 return room;
}
function echoRoomPublic_(cache,room) {
 const copy=echoPublicRow_(room);
 copy.host=echoSocialPerson_(cache,room.host_id);
 copy.members=(room.members||[]).filter(id=>echoFriend_(cache,id,room.host_id)).map(id=>echoSocialPerson_(cache,id)).filter(Boolean);
 return copy;
}
function echoCommunityAction_(body,user,cache) {
 const uid=user.user_id,action=body.action,audience=echoSocialAudience_(cache,user);
 if(action==='social.status') {
  echoFields_(body,[]);
  for(const name of ['Posts','PostComments','PostReactions','Danmaku','Rooms','RoomMessages'])echoTable_(name,cache);
  return {capabilities:['feed','danmaku','rooms'],server_time:echoTime_()};
 }
 if(action==='social.feed') {
  echoFields_(body,['cursor']);
  const page=echoSocialPage_(echoTable_('Posts',cache).rows.filter(row=>audience.has(row.user_id)),body.cursor,20);
  const reactions=echoTable_('PostReactions',cache).rows,comments=echoTable_('PostComments',cache).rows;
  return {posts:page.items.map(row=>({...echoPublicRow_(row),person:echoSocialPerson_(cache,row.user_id),likes:reactions.filter(item=>item.post_id===row.id&&audience.has(item.user_id)).length,liked:reactions.some(item=>item.post_id===row.id&&item.user_id===uid),comments:comments.filter(item=>item.post_id===row.id&&audience.has(item.user_id)).length})),hasMore:page.hasMore};
 }
 if(action==='social.post') {
  echoFields_(body,['id','body','track']);
  const text=echoSocialText_(body.body,1000,true),track=body.track?echoSocialTrack_(body.track):null;
  if(!text&&!track)echoFailure_('INVALID_SOCIAL_CONTENT');
  const table=echoTable_('Posts',cache),existing=echoSocialExisting_(table,body.id,uid,{body:text,track});
  if(existing)return {post:echoPublicRow_(existing)};
  echoSocialLimit_(table,uid,200);
  return {post:echoPublicRow_(table.put({id:body.id,user_id:uid,body:text,track,created_at:echoTime_()}))};
 }
 if(['social.delete','social.react','social.comments','social.comment','social.comment.delete'].includes(action)) {
  const post=echoTable_('Posts',cache).rows.find(row=>row.id===body.post_id);
  if(!post||(!audience.has(post.user_id)&&!(user.role==='admin'&&action==='social.delete')))echoFailure_('FORBIDDEN');
  if(action==='social.delete') {
   echoFields_(body,['post_id']);if(post.user_id!==uid&&user.role!=='admin')echoFailure_('FORBIDDEN');echoDeletePost_(cache,post.id);return {};
  }
  if(action==='social.react') {
   echoFields_(body,['post_id','liked']);if(typeof body.liked!=='boolean')echoFailure_('INVALID_REQUEST');
   const table=echoTable_('PostReactions',cache),row=table.rows.find(item=>item.post_id===post.id&&item.user_id===uid);
   if(body.liked&&!row){echoSocialLimit_(table,uid,2000);table.put({id:Utilities.getUuid(),post_id:post.id,user_id:uid,created_at:echoTime_()})}
   if(!body.liked&&row)table.remove(item=>item===row);
   return {liked:body.liked};
  }
  const table=echoTable_('PostComments',cache);
  if(action==='social.comments') {
   echoFields_(body,['post_id','cursor']);const page=echoSocialPage_(table.rows.filter(row=>row.post_id===post.id&&audience.has(row.user_id)),body.cursor,30);
   return {comments:page.items.map(row=>({...echoPublicRow_(row),person:echoSocialPerson_(cache,row.user_id)})),hasMore:page.hasMore};
  }
  if(action==='social.comment.delete') {
   echoFields_(body,['post_id','id']);const row=table.rows.find(item=>item.post_id===post.id&&item.id===body.id);
   if(!row||(row.user_id!==uid&&post.user_id!==uid&&user.role!=='admin'))echoFailure_('FORBIDDEN');table.remove(item=>item===row);return {};
  }
  echoFields_(body,['post_id','id','body']);const text=echoSocialText_(body.body,500,false),existing=echoSocialExisting_(table,body.id,uid,{post_id:post.id,body:text});
  if(existing)return {comment:echoPublicRow_(existing)};
  echoSocialLimit_(table,uid,1000);return {comment:echoPublicRow_(table.put({id:body.id,post_id:post.id,user_id:uid,body:text,created_at:echoTime_()}))};
 }
 if(action.startsWith('danmaku.')) {
  if(typeof body.track_id!=='string'||body.track_id.length>100||!body.track_id)echoFailure_('INVALID_TRACK');
  const table=echoTable_('Danmaku',cache);
  if(action==='danmaku.read') {
   echoFields_(body,['track_id']);return {messages:table.rows.filter(row=>row.track_id===body.track_id&&audience.has(row.user_id)).sort(echoMessageOrder_).slice(-150).map(row=>({...echoPublicRow_(row),person:echoSocialPerson_(cache,row.user_id)}))};
  }
  if(action==='danmaku.delete') {
   echoFields_(body,['track_id','id']);const row=table.rows.find(item=>item.id===body.id&&item.track_id===body.track_id);
   if(!row||(row.user_id!==uid&&user.role!=='admin'))echoFailure_('FORBIDDEN');table.remove(item=>item===row);return {};
  }
  if(action!=='danmaku.send')echoFailure_('INVALID_REQUEST');
  echoFields_(body,['track_id','id','body','position']);const text=echoSocialText_(body.body,100,false);
  if(typeof body.position!=='number'||!Number.isFinite(body.position)||body.position<0||body.position>43200)echoFailure_('INVALID_REQUEST');
  const fields={track_id:body.track_id,body:text,position:Math.round(body.position*10)/10},existing=echoSocialExisting_(table,body.id,uid,fields);
  if(existing)return {message:echoPublicRow_(existing)};
  echoSocialLimit_(table,uid,500);return {message:echoPublicRow_(table.put({id:body.id,user_id:uid,...fields,created_at:echoTime_()}))};
 }
 if(action==='rooms.list') {
  echoFields_(body,[]);return {rooms:echoTable_('Rooms',cache).rows.filter(row=>!row.closed&&Date.parse(row.expires_at)>Date.now()&&(row.host_id===uid||(row.members||[]).includes(uid)&&audience.has(row.host_id))).map(row=>echoRoomPublic_(cache,row))};
 }
 if(action==='rooms.create') {
  echoFields_(body,['id','name','members','track','position','playing']);
  if(!echoId_(body.id)||!Array.isArray(body.members)||!body.members.length||body.members.length>12||new Set(body.members).size!==body.members.length||body.members.some(id=>!echoFriend_(cache,uid,id)||!audience.has(id)))echoFailure_('FRIENDS_REQUIRED');
  const name=echoSocialText_(body.name,60,false),track=echoSocialTrack_(body.track);
  if(typeof body.position!=='number'||!Number.isFinite(body.position)||body.position<0||body.position>43200||typeof body.playing!=='boolean')echoFailure_('INVALID_REQUEST');
  const table=echoTable_('Rooms',cache),existing=table.rows.find(row=>row.id===body.id);
  if(existing){if(existing.host_id!==uid)echoFailure_('CONTENT_CONFLICT');return {room:echoRoomPublic_(cache,echoRoomAccess_(cache,uid,existing.id)),server_time:echoTime_()}}
  const expired=table.rows.filter(row=>Date.parse(row.expires_at)<=Date.now()).map(row=>row.id);echoTable_('RoomMessages',cache).remove(row=>expired.includes(row.room_id));table.remove(row=>expired.includes(row.id));
  if(table.rows.filter(row=>row.host_id===uid&&!row.closed).length>=3)echoFailure_('SOCIAL_LIMIT');echoThrottle_('rooms-create:'+uid,5,60000);
  const time=echoTime_(),room=table.put({id:body.id,host_id:uid,name,members:body.members,track,position:body.position,playing:body.playing,revision:1,updated_at:time,created_at:time,expires_at:new Date(Date.now()+86400000).toISOString(),closed:false});
  return {room:echoRoomPublic_(cache,room),server_time:echoTime_()};
 }
 if(action.startsWith('rooms.')) {
  const room=echoRoomAccess_(cache,uid,body.id),table=echoTable_('Rooms',cache);
  if(action==='rooms.read') {
   echoFields_(body,['id']);return {room:echoRoomPublic_(cache,room),messages:echoTable_('RoomMessages',cache).rows.filter(row=>row.room_id===room.id&&(row.user_id===room.host_id||(room.members||[]).includes(row.user_id)&&echoFriend_(cache,row.user_id,room.host_id))).sort(echoMessageOrder_).slice(-40).map(row=>({...echoPublicRow_(row),person:echoSocialPerson_(cache,row.user_id)})),server_time:echoTime_()};
  }
  if(action==='rooms.leave') {
   echoFields_(body,['id']);if(uid===room.host_id){room.closed=true;echoTable_('RoomMessages',cache).remove(row=>row.room_id===room.id)}else room.members=room.members.filter(id=>id!==uid);table.put(room);return {};
  }
  if(action==='rooms.update') {
   echoFields_(body,['id','revision','track','position','playing']);if(uid!==room.host_id)echoFailure_('FORBIDDEN');
   if(body.revision!==room.revision)echoFailure_('ROOM_STALE');
   if(typeof body.position!=='number'||!Number.isFinite(body.position)||body.position<0||body.position>43200||typeof body.playing!=='boolean')echoFailure_('INVALID_REQUEST');
   room.track=echoSocialTrack_(body.track);room.position=body.position;room.playing=body.playing;room.updated_at=echoTime_();room.revision++;table.put(room);return {room:echoRoomPublic_(cache,room),server_time:echoTime_()};
  }
  if(action==='rooms.message') {
   echoFields_(body,['id','message_id','body']);const text=echoSocialText_(body.body,500,false),messages=echoTable_('RoomMessages',cache),existing=echoSocialExisting_(messages,body.message_id,uid,{room_id:room.id,body:text});
   if(existing)return {message:echoPublicRow_(existing)};
   echoThrottle_('room-message:'+uid,30,60000);
   const rows=messages.rows.filter(row=>row.room_id===room.id).sort(echoMessageOrder_);if(rows.length>=200)messages.remove(row=>row===rows[0]);
   return {message:echoPublicRow_(messages.put({id:body.message_id,room_id:room.id,user_id:uid,body:text,created_at:echoTime_()}))};
  }
 }
 echoFailure_('INVALID_REQUEST');
}
function echoCommunityDeleteUser_(cache,uid) {
 for(const post of echoTable_('Posts',cache).rows.filter(row=>row.user_id===uid))echoDeletePost_(cache,post.id);
 for(const name of ['PostComments','PostReactions','Danmaku'])echoTable_(name,cache).remove(row=>row.user_id===uid);
 const rooms=echoTable_('Rooms',cache),owned=rooms.rows.filter(row=>row.host_id===uid).map(row=>row.id);
 echoTable_('RoomMessages',cache).remove(row=>row.user_id===uid||owned.includes(row.room_id));rooms.remove(row=>owned.includes(row.id));
 for(const room of rooms.rows)if((room.members||[]).includes(uid)){room.members=room.members.filter(id=>id!==uid);rooms.put(room)}
}

function echoMemberVersion_(row,auth){return echoDigest_(JSON.stringify([row.user_id,row.email,row.handle,row.display_name,row.avatar_path,row.account_status,row.tier,row.premium_until,row.role,auth?.email,auth?.email_verified]))}
function echoMember_(row,cache){const auth=echoTable_('Auth',cache).rows.find(item=>item.user_id===row.user_id);return {...echoProfile_(row),email:row.email,account_status:row.account_status,tier:row.tier,premium_until:row.premium_until||null,role:row.role,email_verified:auth?.email_verified===true,synced_at:row.synced_at,version:echoMemberVersion_(row,auth)}}
function echoAdminPut_(row){const values=ECHO_TABLES.Users.map(key=>echoText_(row[key]));echoBook_().getSheetByName('Users').getRange(row._row,1,1,values.length).setValues([values])}
function echoMemberAdminAction_(body,actor,cache){
 if(actor.role!=='admin'||actor.account_status!=='active')echoFailure_('ADMIN_REQUIRED');
 const users=echoTable_('Users',cache),action=body.action;
 if(action==='admin.list'){
  echoFields_(body,['offset']);const offset=body.offset??0;if(!Number.isInteger(offset)||offset<0||offset>100000)echoFailure_('INVALID_REQUEST');
  const list=users.rows.slice().sort((a,b)=>a.user_id.localeCompare(b.user_id)).slice(offset,offset+30);
  return {users:list.map(row=>echoMember_(row,cache)),offset,hasMore:offset+list.length<users.rows.length,capabilities:['member_admin','redemption_admin']};
 }
 if(action.startsWith('admin.codes.'))return echoRedemptionAdmin_(body,actor,cache);
 const target=users.rows.find(row=>row.user_id===body.id);if(!target)echoFailure_('USER_NOT_FOUND');
 const auth=echoTable_('Auth',cache).rows.find(row=>row.user_id===target.user_id);if(!auth)echoFailure_('USER_NOT_FOUND');
 if(action==='admin.reset-password'){
  echoFields_(body,['id']);echoThrottle_('global-mail',80,86400000);echoThrottle_('admin-reset:'+actor.user_id,8,3600000);echoSendRecovery_(auth,'reset',null,cache);return {sent:true};
 }
 if(action!=='admin.update')echoFailure_('INVALID_REQUEST');
 echoFields_(body,['id','handle','display_name','avatar','email','account_status','tier','premium_until','role','version']);
 const extended=['email','account_status','tier','premium_until','role'].some(key=>Object.prototype.hasOwnProperty.call(body,key));
 if(extended&&!body.version)echoFailure_('INVALID_REQUEST');
 if(body.version&&body.version!==echoMemberVersion_(target,auth))echoFailure_('USER_CHANGED');
 const candidate={...target};echoUpdateName_(body,candidate,users);
 if(Object.prototype.hasOwnProperty.call(body,'email')){candidate.email=echoEmail_(body.email);if(users.rows.some(row=>row.user_id!==candidate.user_id&&String(row.email).toLowerCase()===candidate.email)||echoTable_('Auth',cache).rows.some(row=>row.user_id!==candidate.user_id&&String(row.email).toLowerCase()===candidate.email))echoFailure_('EMAIL_TAKEN')}
 if(Object.prototype.hasOwnProperty.call(body,'account_status'))candidate.account_status=body.account_status;
 if(Object.prototype.hasOwnProperty.call(body,'tier'))candidate.tier=body.tier;
 if(Object.prototype.hasOwnProperty.call(body,'role'))candidate.role=body.role;
 if(Object.prototype.hasOwnProperty.call(body,'premium_until')){if(body.premium_until!==null&&(typeof body.premium_until!=='string'||body.premium_until.length>40||!Number.isFinite(Date.parse(body.premium_until))))echoFailure_('INVALID_MEMBERSHIP');candidate.premium_until=body.premium_until?new Date(body.premium_until).toISOString():''}
 if(!['active','suspended','disabled'].includes(candidate.account_status)||!['free','premium'].includes(candidate.tier)||!['member','admin'].includes(candidate.role))echoFailure_('INVALID_MEMBERSHIP');
 if(!users.rows.some(row=>{const value=row.user_id===candidate.user_id?candidate:row;return value.role==='admin'&&value.account_status==='active'}))echoFailure_('LAST_ADMIN');
 const avatar=body.avatar||{mode:'keep'},allowed={keep:['mode'],remove:['mode'],copy:['mode','path'],upload:['mode','image']}[avatar?.mode];
 if(!allowed||Object.keys(avatar).some(key=>!allowed.includes(key)))echoFailure_('INVALID_AVATAR');
 if(avatar.mode==='copy'&&(!echoAvatarPath_(avatar.path)||!users.rows.some(row=>row.avatar_path===avatar.path)))echoFailure_('INVALID_AVATAR');
 if(avatar.mode==='upload'&&(typeof avatar.image!=='string'||avatar.image.length>1400000||!/^[A-Za-z0-9+/]+={0,2}$/.test(avatar.image)))echoFailure_('INVALID_AVATAR');
 let freshPath=null,committed=false;
 try{
  if(avatar.mode==='copy'||avatar.mode==='upload'){freshPath=candidate.user_id+'/'+Utilities.getUuid()+'.jpg';echoAvatarCall_(avatar.mode==='copy'?{action:'copy',source:avatar.path,path:freshPath}:{action:'upload',image:avatar.image,path:freshPath});candidate.avatar_path=freshPath}else if(avatar.mode==='remove')candidate.avatar_path='';
  const currentCache={},currentUsers=echoTable_('Users',currentCache),current=currentUsers.rows.find(row=>row.user_id===target.user_id),currentAuth=echoTable_('Auth',currentCache).rows.find(row=>row.user_id===target.user_id),currentActor=currentUsers.rows.find(row=>row.user_id===actor.user_id);
  if(currentActor?.role!=='admin'||currentActor?.account_status!=='active')echoFailure_('ADMIN_REQUIRED');
  if(!current||!currentAuth||echoMemberVersion_(current,currentAuth)!==echoMemberVersion_(target,auth))echoFailure_('USER_CHANGED');
  if(!currentUsers.rows.some(row=>{const value=row.user_id===candidate.user_id?candidate:row;return value.role==='admin'&&value.account_status==='active'}))echoFailure_('LAST_ADMIN');
  const emailChanged=String(currentAuth.email).toLowerCase()!==String(candidate.email).toLowerCase();
  const previousAuth={...currentAuth};
  if(emailChanged){currentAuth.email=candidate.email;currentAuth.email_verified=false;currentAuth.failed_attempts=0;currentAuth.locked_until='';echoTable_('Auth',currentCache).put(currentAuth)}
  candidate._row=current._row;candidate.created_at=current.created_at;candidate.synced_at=echoTime_();
  try{echoAdminPut_(candidate);committed=true}catch(error){if(emailChanged)echoTable_('Auth',currentCache).put(previousAuth);throw error}
  if(emailChanged||candidate.account_status!=='active'){echoTable_('Sessions',currentCache).remove(row=>row.user_id===candidate.user_id);if(emailChanged)echoTable_('Recovery',currentCache).remove(row=>row.user_id===candidate.user_id)}
  const old=current.avatar_path;if(old&&old!==candidate.avatar_path)try{echoAvatarCall_({action:'remove',path:old})}catch{}
  return {profile:echoMember_(candidate,currentCache),emailChanged,sessionRevoked:emailChanged||candidate.account_status!=='active'};
 }catch(error){if(freshPath&&!committed)try{echoAvatarCall_({action:'remove',path:freshPath})}catch{}throw error}
}

function echoCode_(value){if(typeof value!=='string'||value.length>80)echoFailure_('INVALID_CODE');const code=value.trim().toUpperCase().replace(/[\s-]/g,'');if(!/^ECHO[0-9A-F]{32}$/.test(code))echoFailure_('INVALID_CODE');return code}
function echoCodePublic_(row,cache){const count=echoTable_('Redemptions',cache).rows.filter(item=>item.code_id===row.id&&item.state!=='cancelled').length;return {id:row.id,code_hint:row.code_hint,label:row.label,days:row.days,max_uses:row.max_uses,uses:count,expires_at:row.expires_at||null,enabled:row.enabled===true,created_at:row.created_at}}
function echoRedemptionAdmin_(body,actor,cache){
 if(actor.role!=='admin'||actor.account_status!=='active')echoFailure_('ADMIN_REQUIRED');
 const table=echoTable_('RedemptionCodes',cache);
 if(body.action==='admin.codes.list'){
  echoFields_(body,['cursor']);const page=echoSocialPage_(table.rows,body.cursor,30);return {codes:page.items.map(row=>echoCodePublic_(row,cache)),hasMore:page.hasMore};
 }
 if(body.action==='admin.codes.set'){
  echoFields_(body,['id','enabled']);const row=table.rows.find(item=>item.id===body.id);if(!row||typeof body.enabled!=='boolean')echoFailure_('INVALID_REQUEST');row.enabled=body.enabled;table.put(row);return {code:echoCodePublic_(row,cache)};
 }
 if(body.action!=='admin.codes.create')echoFailure_('INVALID_REQUEST');
 echoFields_(body,['codes','label','days','max_uses','expires_at']);
 if(!Array.isArray(body.codes)||body.codes.length<1||body.codes.length>20||typeof body.label!=='string'||body.label.length>60||!Number.isInteger(body.days)||body.days<1||body.days>3650||!Number.isInteger(body.max_uses)||body.max_uses<1||body.max_uses>10000)echoFailure_('INVALID_CODE_SETTINGS');
 if(body.expires_at!==null&&(typeof body.expires_at!=='string'||body.expires_at.length>40||!Number.isFinite(Date.parse(body.expires_at))))echoFailure_('INVALID_CODE_SETTINGS');
 const expires=body.expires_at?new Date(body.expires_at).toISOString():'';if(expires&&Date.parse(expires)<=Date.now())echoFailure_('INVALID_CODE_SETTINGS');
 const prepared=body.codes.map(item=>{if(!item||Object.keys(item).some(key=>!['id','code'].includes(key))||!echoId_(item.id))echoFailure_('INVALID_REQUEST');const code=echoCode_(item.code);return {id:item.id,code,hash:echoDigest_(code)}});
 if(new Set(prepared.map(row=>row.id)).size!==prepared.length||new Set(prepared.map(row=>row.hash)).size!==prepared.length)echoFailure_('INVALID_REQUEST');
 for(const item of prepared){const existing=table.rows.find(row=>row.id===item.id||row.code_hash===item.hash);if(existing&&(existing.id!==item.id||existing.code_hash!==item.hash||existing.created_by!==actor.user_id||existing.days!==body.days||existing.max_uses!==body.max_uses||existing.expires_at!==expires||existing.label!==body.label.trim()))echoFailure_('CONTENT_CONFLICT')}
 echoThrottle_('code-create:'+actor.user_id,20,3600000);
 const result=[];
 for(const item of prepared){let row=table.rows.find(value=>value.id===item.id);if(!row)row=table.put({id:item.id,code_hash:item.hash,code_hint:item.code.slice(-6),label:body.label.trim(),days:body.days,max_uses:body.max_uses,expires_at:expires,enabled:true,created_by:actor.user_id,created_at:echoTime_()});result.push({...echoCodePublic_(row,cache),code:'ECHO-'+item.code.slice(4).match(/.{8}/g).join('-')})}
 return {codes:result};
}
function echoApplyRedemption_(receipt,user,cache){
 const sheet=echoBook_().getSheetByName('Users'),controls=sheet.getRange(user._row,6,1,3).getValues()[0],tier=String(controls[1]),until=controls[2] instanceof Date?controls[2].toISOString():String(controls[2]||'');
 const alreadyApplied=tier==='premium'&&Number.isFinite(Date.parse(until))&&Date.parse(until)>=Date.parse(receipt.premium_until),unchanged=tier===receipt.previous_tier&&until===receipt.previous_until;
 if(controls[0]!=='active'||(!alreadyApplied&&!unchanged)){receipt.state='cancelled';echoTable_('Redemptions',cache).put(receipt);echoFailure_('REDEMPTION_CHANGED')}
 if(!alreadyApplied)sheet.getRange(user._row,7,1,2).setValues([['premium',receipt.premium_until]]);
 user.tier='premium';user.premium_until=alreadyApplied?until:receipt.premium_until;receipt.state='applied';receipt.applied_at=echoTime_();echoTable_('Redemptions',cache).put(receipt);
}
function echoRedemptionAction_(body,user,cache){
 const uid=user.user_id,receipts=echoTable_('Redemptions',cache);
 if(body.action==='redemption.history'){
  echoFields_(body,[]);for(const receipt of receipts.rows.filter(row=>row.user_id===uid&&row.state==='pending')){try{echoApplyRedemption_(receipt,user,cache)}catch(error){if(error.message!=='REDEMPTION_CHANGED')throw error}}return {redemptions:receipts.rows.filter(row=>row.user_id===uid&&row.state==='applied').sort(echoMessageOrder_).reverse().slice(0,30).map(row=>({id:row.id,days:row.days,created_at:row.created_at,premium_until:row.premium_until})),account:echoAccount_(user)};
 }
 if(body.action!=='redemption.redeem')echoFailure_('INVALID_REQUEST');
 echoFields_(body,['code']);echoThrottle_('redeem:'+uid,10,600000);
 const hash=echoDigest_(echoCode_(body.code)),code=echoTable_('RedemptionCodes',cache).rows.find(row=>row.code_hash===hash);if(!code)echoFailure_('CODE_UNAVAILABLE');
 const existing=receipts.rows.find(row=>row.user_id===uid&&row.code_id===code.id);
 if(existing){if(existing.state==='cancelled')echoFailure_('REDEMPTION_CHANGED');if(existing.state==='pending')echoApplyRedemption_(existing,user,cache);return {account:echoAccount_(user),alreadyRedeemed:true,redemption:{id:existing.id,days:existing.days,premium_until:existing.premium_until}}}
 if(code.enabled!==true||code.expires_at&&Date.parse(code.expires_at)<=Date.now()||receipts.rows.filter(row=>row.code_id===code.id&&row.state!=='cancelled').length>=code.max_uses)echoFailure_('CODE_UNAVAILABLE');
 if(!Number.isInteger(code.days)||code.days<1||code.days>3650||!Number.isInteger(code.max_uses)||code.max_uses<1||code.max_uses>10000||code.expires_at&&!Number.isFinite(Date.parse(code.expires_at)))echoFailure_('CODE_UNAVAILABLE');
 if(user.tier==='premium'&&!user.premium_until)echoFailure_('MEMBERSHIP_NO_EXPIRY');
 const oldUntil=user.premium_until||'',start=user.tier==='premium'?Math.max(Date.now(),Date.parse(oldUntil)||0):Date.now(),expiry=new Date(start+code.days*86400000).toISOString();
 const receipt=receipts.put({id:Utilities.getUuid(),code_id:code.id,user_id:uid,days:code.days,previous_tier:user.tier,previous_until:oldUntil,premium_until:expiry,state:'pending',created_at:echoTime_(),applied_at:''});
 echoApplyRedemption_(receipt,user,cache);return {account:echoAccount_(user),alreadyRedeemed:false,redemption:{id:receipt.id,days:receipt.days,premium_until:receipt.premium_until}};
}
function echoRedemptionDeleteUser_(cache,uid){const receipts=echoTable_('Redemptions',cache);for(const row of receipts.rows.filter(item=>item.user_id===uid)){row.user_id='';row.previous_until='';row.previous_tier='';if(row.state==='pending')row.state='cancelled';receipts.put(row)}const codes=echoTable_('RedemptionCodes',cache);for(const row of codes.rows.filter(item=>item.created_by===uid)){row.created_by='';codes.put(row)}}
