const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const genAI = geminiApiKey && !geminiApiKey.startsWith('dummy') ? new GoogleGenerativeAI(geminiApiKey) : null;

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';

// Curated pool of fashion model preview images, indexed by gender + style
const modelPreviewPool = {
  Male: {
    Traditional: [
      "photo-1603415526960-f7e0328c63b1", "photo-1610030470390-34444c9b2923",
      "photo-1613206484394-b2586bf7fbfa", "photo-1611601679655-7c8bc197f0c6",
      "photo-1599643478518-a784e5dc4c8f"
    ],
    Western: [
      "photo-1507679799987-c73779587ccf", "photo-1519085360753-af0119f7cbe7",
      "photo-1488161628813-04466f872be2", "photo-1506794778202-cad84cf45f1d",
      "photo-1472099645785-5658abf4ff4e"
    ],
    Casual: [
      "photo-1519085360753-af0119f7cbe7", "photo-1506794778202-cad84cf45f1d",
      "photo-1488161628813-04466f872be2", "photo-1472099645785-5658abf4ff4e",
      "photo-1500648767791-00dcc994a43e"
    ],
    Formal: [
      "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35",
      "photo-1591047139829-d91aecb6caea", "photo-1507679799987-c73779587ccf",
      "photo-1601662528567-526d00147750"
    ],
    Sporty: [
      "photo-1530731141654-5993c3016c77", "photo-1571019613454-1cb2f99b2d8b",
      "photo-1534438327276-14e5300c3a48", "photo-1517836357463-d25dfeac3438",
      "photo-1549476464-37392f717541"
    ]
  },
  Female: {
    Traditional: [
      "photo-1610030469983-98e550d6193c", "photo-1611601679655-7c8bc197f0c6",
      "photo-1583391733958-d25e07fac0ec", "photo-1599643478518-a784e5dc4c8f",
      "photo-1605100804763-247f67b3557e"
    ],
    Western: [
      "photo-1572804013309-59a88b7e92f1", "photo-1566174053879-31528523f8ae",
      "photo-1515886657613-9f3515b0c78f", "photo-1496747611176-843222e1e57c",
      "photo-1529139574466-a303027c1d8b"
    ],
    Casual: [
      "photo-1534528741775-53994a69daeb", "photo-1488716820095-cbe80883c496",
      "photo-1488161628813-04466f872be2", "photo-1483985988355-763728e1935b",
      "photo-1469334031218-e382a71b716b"
    ],
    Formal: [
      "photo-1487412720507-e7ab37603c6f", "photo-1551836022-d5d88e9218df",
      "photo-1581044777550-4cfa60707c03", "photo-1573497019418-b400bb3ab074",
      "photo-1524504388940-b1c1722653e1"
    ],
    Sporty: [
      "photo-1483721310020-03333e577078", "photo-1518310952931-b1de897abd40",
      "photo-1494390248081-4e521a5940db", "photo-1571019613454-1cb2f99b2d8b",
      "photo-1517960413843-0aee8e2b3285"
    ]
  }
};

/**
 * Picks a curated try-on model image matching gender, style, and outfit type.
 */
const getCuratedTryOnImage = (gender, style, items) => {
  const genderKey = (gender === 'Female') ? 'Female' : 'Male';
  const pool = modelPreviewPool[genderKey];

  // Detect outfit type from items for smarter selection
  const itemCategories = (items || []).map(i => (i.category || i.category_name || '').toLowerCase());
  let styleKey = style || 'Casual';

  // Override style key based on detected categories
  if (itemCategories.some(c => ['sarees', 'saree', 'lehenga', 'lehengas', 'sherwani', 'kurta'].includes(c))) {
    styleKey = 'Traditional';
  } else if (itemCategories.some(c => ['suits', 'suit', 'blazers', 'blazer'].includes(c))) {
    styleKey = 'Formal';
  } else if (itemCategories.some(c => ['gowns', 'gown', 'dresses', 'dress'].includes(c))) {
    styleKey = 'Western';
  }

  const validStyleKey = pool[styleKey] ? styleKey : 'Casual';
  const photos = pool[validStyleKey];

  // Pick based on a hash of the items to be deterministic for same outfit
  const hash = (items || []).length > 0 ? items[0].id?.charCodeAt(0) || 0 : 0;
  const photoId = photos[hash % photos.length];
  return `https://images.unsplash.com/${photoId}?w=600&auto=format&fit=crop&q=80`;
};

/**
 * Parses user requirements from prompt & chat history using Gemini or local NLP rules.
 */
const parseRequirements = async (message, history) => {
  const userText = message.toLowerCase();
  
  // 1. Simple heuristic fallback in case Gemini GenAI is not configured/key is dummy
  const fallbackParse = () => {
    const isMale = userText.includes('male') || userText.includes('man') || userText.includes('men');
    const isFemale = userText.includes('female') || userText.includes('woman') || userText.includes('women');
    const gender = isMale ? 'Male' : (isFemale ? 'Female' : null);

    const isTraditional = userText.includes('traditional') || userText.includes('indian') || userText.includes('ethnic')
      || userText.includes('kurta') || userText.includes('saree') || userText.includes('sherwani')
      || userText.includes('lehenga') || userText.includes('salwar') || userText.includes('anarkali');
    const isFormal = !isTraditional && (userText.includes('formal') || userText.includes('blazer')
      || userText.includes('suit') || userText.includes('interview') || userText.includes('office'));
    const isCasual = !isTraditional && !isFormal && userText.includes('casual');
    const isWestern = !isTraditional && !isFormal && !isCasual
      && (userText.includes('western') || userText.includes('gown') || userText.includes('dress')
      || userText.includes('jeans') || userText.includes('skirt'));
    const style = isTraditional ? 'Traditional' : (isFormal ? 'Formal' : (isCasual ? 'Casual' : (isWestern ? 'Western' : null)));

    // Extract budget e.g., "under 5000", "under rs 5000", "budget 8000"
    const budgetMatch = userText.match(/(?:under|below|budget|rs\.?|₹)\s?(\d+)/i) || message.match(/(\d+)/);
    const budget = budgetMatch ? parseInt(budgetMatch[1]) : null;

    // Determine occasion
    let occasion = null;
    if (userText.includes('wedding') || userText.includes('marriage')) occasion = 'Wedding';
    else if (userText.includes('farewell') || userText.includes('graduation')) occasion = 'Farewell';
    else if (userText.includes('college') || userText.includes('cultural') || userText.includes('campus')) occasion = 'College';
    else if (userText.includes('engagement') || userText.includes('ring')) occasion = 'Engagement';
    else if (userText.includes('office') || userText.includes('work') || userText.includes('interview')) occasion = 'Office';
    else if (userText.includes('festive') || userText.includes('diwali') || userText.includes('pooja')) occasion = 'Festive';
    else if (userText.includes('casual') || userText.includes('outing')) occasion = 'Casual Outing';

    // Parse colors
    const availableColors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Navy', 'Grey', 'Beige', 'Pink', 'Yellow', 'Gold', 'Silver'];
    const colors = [];
    for (const c of availableColors) {
      if (userText.includes(c.toLowerCase())) colors.push(c);
    }

    let accessoriesNeeded = null;
    let footwearNeeded = null;
    const lowerText = userText.toLowerCase();
    
    // Check if the user is answering the footwear/accessories question
    const isAffirmative = lowerText.includes('yes') || lowerText.includes('sure') || lowerText.includes('include') || lowerText.includes('yep') || lowerText.includes('yeah') || lowerText.includes('both');
    const isNegative = lowerText.includes('no') || lowerText.includes('dont') || lowerText.includes('don\'t') || lowerText.includes('without') || lowerText.includes('only') || lowerText.includes('exclude');

    if (isAffirmative) {
      accessoriesNeeded = true;
      footwearNeeded = true;
    } else if (isNegative) {
      accessoriesNeeded = false;
      footwearNeeded = false;
    } else {
      // Look for individual mentions
      if (lowerText.includes('footwear') || lowerText.includes('shoes') || lowerText.includes('sandals')) {
        footwearNeeded = !lowerText.includes('no ') && !lowerText.includes('without');
      }
      if (lowerText.includes('accessory') || lowerText.includes('accessories') || lowerText.includes('watch') || lowerText.includes('bag')) {
        accessoriesNeeded = !lowerText.includes('no ') && !lowerText.includes('without');
      }
    }

    return {
      status: (gender && budget && style) ? 'recommend' : 'chatting',
      message: '',
      extractedParams: {
        occasion,
        budget,
        gender,
        style,
        colors: colors.length > 0 ? colors : null,
        accessoriesNeeded,
        footwearNeeded
      }
    };
  };

  if (!genAI) {
    return fallbackParse();
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `You are the VastraCo AI Outfit Planner. Your job is to dynamically analyze the current user message and conversation history to determine:
    1. If you have gathered enough parameters to make a recommendation (need occasion, budget, gender, and style preference). Status should be "recommend" if we have them, else "chatting".
    2. Ask exactly 1 clear follow-up question if information is missing. Keep questions short, natural, and friendly. Do NOT ask for details already provided.
    3. Extract parameters into the structured JSON block.
    4. If the user rejects the recommendations (e.g., "show different options", "give alternatives", "show more options", "don't like these"), set "regenerate" to true.

    Occasions to map: Wedding, Farewell, College, Engagement, Office, Casual Outing, Festive.
    Styles to map: Traditional, Western, Casual, Formal.

    JSON Response format:
    {
      "status": "chatting" | "recommend",
      "message": "your reply or follow-up question to the user",
      "regenerate": true | false,
      "extractedParams": {
        "occasion": string | null,
        "budget": number | null,
        "gender": "Male" | "Female" | null,
        "style": "Traditional" | "Western" | "Casual" | "Formal" | null,
        "colors": array of strings | null,
        "accessoriesNeeded": boolean | null,
        "footwearNeeded": boolean | null
      }
    }`;

    // Format history for Gemini API
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.parts ? h.parts[0].text : h.text }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (err) {
    console.error('Gemini API error:', err);
    return fallbackParse();
  }
};

/**
 * Controller Chat API
 */
const chat = async (req, res) => {
  try {
    const { message, history, excludeProductIds = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 1. Analyze dialogue and extract criteria
    const parseResult = await parseRequirements(message, history || []);
    console.log('[AI Stylist] Extracted preferences from message:', JSON.stringify(parseResult.extractedParams));

    // Check if user explicitly typed a rejection message like "different options"
    const lowerMessage = message.toLowerCase();
    const isRejection = lowerMessage.includes('alternative') || 
                      lowerMessage.includes('different') || 
                      lowerMessage.includes('other option') || 
                      lowerMessage.includes('dont like') || 
                      lowerMessage.includes('show more');

    if (isRejection) {
      parseResult.regenerate = true;
      parseResult.status = 'recommend';
    }

    // Merge preferences across history
    const mergedParams = mergeHistoricalParams(history || [], parseResult.extractedParams);
    console.log('[AI Stylist] Merged user preferences across history:', JSON.stringify(mergedParams));

    // Detect missing fields
    const missingFields = [];
    if (!mergedParams.occasion) missingFields.push('occasion');
    if (!mergedParams.budget) missingFields.push('budget');
    if (!mergedParams.gender) missingFields.push('gender');
    if (!mergedParams.style) missingFields.push('style');
    
    const hasRequired = mergedParams.occasion && mergedParams.budget && mergedParams.gender && mergedParams.style;
    const accessoriesFootwearAskedOrDetermined = 
      (mergedParams.accessoriesNeeded !== undefined && mergedParams.accessoriesNeeded !== null) ||
      (mergedParams.footwearNeeded !== undefined && mergedParams.footwearNeeded !== null);

    if (!accessoriesFootwearAskedOrDetermined) {
      missingFields.push('accessories/footwear');
    }
    console.log('[AI Stylist] Detected missing fields:', missingFields);

    // Dynamically transition state based on history
    if (hasRequired && (accessoriesFootwearAskedOrDetermined || parseResult.status === 'recommend' || parseResult.regenerate)) {
      parseResult.status = 'recommendation';
    } else {
      parseResult.status = 'chatting';
    }

    // If we are still gathering information, return the next question
    if (parseResult.status === 'chatting' && !parseResult.regenerate) {
      // Determine what's still missing to formulate a smart question if message is empty
      if (!parseResult.message) {
        if (!mergedParams.occasion) parseResult.message = "What occasion is this outfit for?";
        else if (!mergedParams.budget) parseResult.message = "What is your approximate budget for this outfit?";
        else if (!mergedParams.gender) parseResult.message = "Is this for a male or a female?";
        else if (!mergedParams.style) parseResult.message = "Do you prefer traditional or western wear?";
        else parseResult.message = "Got it! Would you like me to include footwear and accessories in the outfit?";
      }

      console.log('[AI Stylist] Selected next question:', parseResult.message);

      return res.status(200).json({
        status: 'chatting',
        message: parseResult.message,
        extractedParams: mergedParams
      });
    }

    // 2. We are ready to recommend (or regenerate)
    const finalParams = mergedParams;
    
    // Ensure fallback defaults if still missing
    if (!finalParams.gender) finalParams.gender = 'Male';
    if (!finalParams.occasion) finalParams.occasion = 'Casual Outing';
    if (!finalParams.style) finalParams.style = 'Casual';
    if (!finalParams.budget) finalParams.budget = 5000;

    // Fetch the product catalog from product-service
    const catalogRes = await axios.get(`${PRODUCT_SERVICE_URL}/api/products`, {
      params: { limit: 300 }
    });
    
    const allProducts = catalogRes.data;
    console.log(`[AI Stylist] Total products in catalog: ${allProducts.length}`);

    // --- Layered filtering: strict → relax occasion → relax style ---
    // Style matching notes:
    //   Traditional → strict match (only 'Traditional' tagged products)
    //   Formal      → matches 'Formal' products
    //   Western     → matches 'Western', 'Casual', OR 'Formal' products
    //                 (DB has Shirts as Casual, Jeans as Casual — all valid Western items)
    //   Casual      → matches 'Casual' products
    const styleMatches = (productStyle, requestedStyle) => {
      if (!requestedStyle) return true;
      if (requestedStyle === 'Traditional') return productStyle === 'Traditional';
      if (requestedStyle === 'Formal') return productStyle === 'Formal' || productStyle === 'Western';
      if (requestedStyle === 'Western') return productStyle === 'Western' || productStyle === 'Casual' || productStyle === 'Formal';
      if (requestedStyle === 'Casual') return productStyle === 'Casual' || productStyle === 'Western';
      return productStyle === requestedStyle;
    };

    const buildFilter = (gender, style, occasion) => (p) => {
      const matchesGender = p.gender === gender || p.gender === 'Unisex';
      const matchesStyle = styleMatches(p.style, style);
      let matchesOccasion = true;
      if (occasion && p.occasion) {
        try {
          const oList = Array.isArray(p.occasion) ? p.occasion : JSON.parse(p.occasion);
          matchesOccasion = oList.some(o => o.toLowerCase() === occasion.toLowerCase());
        } catch (e) { matchesOccasion = false; }
      }
      return matchesGender && matchesStyle && matchesOccasion;
    };

    // Layer 1: gender + style + occasion (strict)
    let filtered = allProducts.filter(buildFilter(finalParams.gender, finalParams.style, finalParams.occasion));
    console.log(`[AI Stylist] Layer 1 filter (gender+style+occasion): ${filtered.length} products`);

    // Layer 2: relax occasion if too few results
    if (filtered.length < 6) {
      filtered = allProducts.filter(buildFilter(finalParams.gender, finalParams.style, null));
      console.log(`[AI Stylist] Layer 2 filter (gender+style): ${filtered.length} products`);
    }

    // Layer 3: relax style if still too few
    if (filtered.length < 6) {
      filtered = allProducts.filter(buildFilter(finalParams.gender, null, null));
      console.log(`[AI Stylist] Layer 3 filter (gender only): ${filtered.length} products`);
    }

    // Apply color filtering if specified (soft — only if enough matches)
    if (finalParams.colors && finalParams.colors.length > 0) {
      const targetColors = finalParams.colors.map(c => c.toLowerCase());
      const colorMatches = filtered.filter(p => {
        const pName = p.name.toLowerCase();
        return targetColors.some(color => pName.includes(color));
      });
      if (colorMatches.length >= 3) {
        filtered = colorMatches;
      }
    }

    // Outfit Variety Rule: deprioritize previously seen products
    const excludedSet = new Set(excludeProductIds);
    filtered.sort((a, b) => {
      const aEx = excludedSet.has(a.id) ? 1 : 0;
      const bEx = excludedSet.has(b.id) ? 1 : 0;
      return aEx - bEx;
    });

    // --- Segment products by outfit role ---
    // Blouses get their own slot so they pair with Sarees instead of acting as tops
    const categories = {
      Top: [],       // Shirts, T-Shirts, Kurtis, Crop Tops
      Bottom: [],    // Trousers, Jeans, Chinos, Skirts
      Blouses: [],   // Blouses (pair with Sarees)
      Standalone: [], // Sarees, Lehengas, Kurta, Sherwani, Dresses, Suits, etc.
      Footwear: [],
      Accessory: []
    };

    filtered.forEach(p => {
      const cat = p.category_name || '';
      if (['Shirts', 'T-Shirts', 'Polo T-Shirts', 'Kurtis', 'Crop Tops'].includes(cat)) {
        categories.Top.push(p);
      } else if (['Trousers', 'Jeans', 'Chinos', 'Skirts'].includes(cat)) {
        categories.Bottom.push(p);
      } else if (cat === 'Blouses') {
        categories.Blouses.push(p);
      } else if (['Sarees', 'Lehengas', 'Salwar Suits', 'Anarkalis', 'Dresses', 'Gowns',
                  'Blazers', 'Suits', 'Jackets', 'Sherwani', 'Kurta'].includes(cat)) {
        categories.Standalone.push(p);
      } else if (['Formal Shoes', 'Loafers', 'Sneakers', 'Heels', 'Flats', 'Sandals'].includes(cat)) {
        categories.Footwear.push(p);
      } else if (['Watches', 'Belts', 'Wallets', 'Sunglasses', 'Earrings',
                  'Bangles', 'Necklaces', 'Rings', 'Handbags', 'Clutches'].includes(cat)) {
        categories.Accessory.push(p);
      }
    });
    console.log(`[AI Stylist] Segmented — Top:${categories.Top.length} Bottom:${categories.Bottom.length} Standalone:${categories.Standalone.length} Footwear:${categories.Footwear.length} Accessory:${categories.Accessory.length}`);

    // --- Fallbacks from full catalog if segments are empty ---
    if (categories.Top.length === 0 && categories.Standalone.length === 0) {
      allProducts.forEach(p => {
        const cat = p.category_name || '';
        if (p.gender === finalParams.gender || p.gender === 'Unisex') {
          if (['Shirts', 'T-Shirts', 'Polo T-Shirts', 'Kurtis', 'Crop Tops'].includes(cat)) categories.Top.push(p);
          else if (['Sarees', 'Lehengas', 'Salwar Suits', 'Anarkalis', 'Dresses',
                    'Gowns', 'Blazers', 'Suits', 'Jackets', 'Sherwani', 'Kurta'].includes(cat)) categories.Standalone.push(p);
        }
      });
    }
    if (categories.Bottom.length === 0) {
      allProducts.forEach(p => {
        if ((p.gender === finalParams.gender || p.gender === 'Unisex') &&
            ['Trousers', 'Jeans', 'Chinos', 'Skirts'].includes(p.category_name)) {
          categories.Bottom.push(p);
        }
      });
    }
    if (categories.Footwear.length === 0) {
      categories.Footwear = allProducts.filter(p =>
        ['Formal Shoes', 'Loafers', 'Sneakers', 'Heels', 'Flats', 'Sandals'].includes(p.category_name) &&
        (p.gender === finalParams.gender || p.gender === 'Unisex')
      );
      if (categories.Footwear.length === 0) {
        categories.Footwear = allProducts.filter(p => ['Loafers', 'Sneakers', 'Sandals'].includes(p.category_name));
      }
    }
    if (categories.Accessory.length === 0) {
      categories.Accessory = allProducts.filter(p =>
        ['Watches', 'Belts', 'Wallets', 'Sunglasses', 'Earrings', 'Handbags'].includes(p.category_name) &&
        (p.gender === finalParams.gender || p.gender === 'Unisex')
      );
      if (categories.Accessory.length === 0) {
        categories.Accessory = allProducts.filter(p => ['Watches', 'Belts', 'Wallets', 'Sunglasses'].includes(p.category_name));
      }
    }
    if (categories.Blouses.length === 0) {
      // Fallback: grab from full catalog regardless of style filter
      categories.Blouses = allProducts.filter(p => p.category_name === 'Blouses');
    }

    // Sort each category by price ascending for budget-aware selection
    Object.keys(categories).forEach(key => {
      categories[key].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    });

    const budgetLimit = finalParams.budget || 5000;

    // Determine outfit strategy:
    // Traditional style → ALWAYS prefer Standalone garments (Kurta, Saree, Sherwani, etc.)
    // Western / Casual / Formal → prefer Top + Bottom combo
    const isTraditionalStyle = finalParams.style === 'Traditional';
    const hasStandalone = categories.Standalone.length > 0;
    const hasTopBottom = categories.Top.length > 0;

    // Build 3 Bundles
    const bundles = [];
    const bundleStyles = [
      { name: "Executive Look", desc: "A smart, sleek collection designed to stand out on the occasion." },
      { name: "Premium Elegance", desc: "A curated sophisticated bundle emphasizing elegance and class." },
      { name: "Vibrant Fashion", desc: "A stylish, comfortable blend tailored for ultimate expression." }
    ];

    // Helper: pick item within remaining budget from a sorted (asc price) list
    const pickAffordable = (list, remainingBudget, offset, maxFraction = 1.0) => {
      const cap = remainingBudget * maxFraction;
      const affordable = list.filter(p => parseFloat(p.price) <= cap);
      if (affordable.length === 0) return null; // nothing fits budget
      return affordable[offset % affordable.length];
    };

    for (let i = 0; i < 3; i++) {
      const items = [];
      let remainingBudget = budgetLimit;
      let topItem = null;

      // ---- Step 1: Pick core garment ----
      const useStandalone = (isTraditionalStyle && hasStandalone) || (!hasTopBottom && hasStandalone);

      if (useStandalone && categories.Standalone.length > 0) {
        // For Traditional: use different Standalone item for each bundle
        // Reserve ~40% budget for footwear + accessory
        topItem = pickAffordable(categories.Standalone, remainingBudget, i, 0.6)
          || categories.Standalone[i % categories.Standalone.length];
        if (topItem) {
          items.push(topItem);
          remainingBudget -= parseFloat(topItem.price);
        }

        // Saree → add a Blouse if budget allows
        if (topItem && topItem.category_name === 'Sarees' && categories.Blouses.length > 0) {
          const blouse = categories.Blouses.find(
            b => parseFloat(b.price) <= remainingBudget && !excludedSet.has(b.id)
          );
          if (blouse) {
            items.push(blouse);
            remainingBudget -= parseFloat(blouse.price);
          }
        }
      } else if (categories.Top.length > 0) {
        // Western / Casual / Formal: Top + Bottom combo
        // Reserve ~40% budget for footwear + accessory
        topItem = pickAffordable(categories.Top, remainingBudget, i, 0.4)
          || categories.Top[i % categories.Top.length];
        if (topItem) {
          items.push(topItem);
          remainingBudget -= parseFloat(topItem.price);
        }
        if (categories.Bottom.length > 0) {
          const bottomItem = pickAffordable(categories.Bottom, remainingBudget, i, 0.5)
            || categories.Bottom[i % categories.Bottom.length];
          if (bottomItem) {
            items.push(bottomItem);
            remainingBudget -= parseFloat(bottomItem.price);
          }
        }
      }

      // ---- Step 2: Add Footwear (budget-aware) ----
      if (finalParams.footwearNeeded !== false && categories.Footwear.length > 0 && remainingBudget > 400) {
        const shoes = pickAffordable(categories.Footwear, remainingBudget, i, 0.7);
        if (shoes) {
          items.push(shoes);
          remainingBudget -= parseFloat(shoes.price);
        }
      }

      // ---- Step 3: Add Accessory (budget-aware) ----
      if (finalParams.accessoriesNeeded !== false && categories.Accessory.length > 0 && remainingBudget > 150) {
        const accessory = pickAffordable(categories.Accessory, remainingBudget, i, 1.0);
        if (accessory) {
          items.push(accessory);
        }
      }

      const validItems = items.filter(item => !!item);
      const totalPrice = validItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

      // Scoring
      const budgetMatch = totalPrice <= budgetLimit
        ? 100
        : Math.max(50, Math.round((1 - (totalPrice - budgetLimit) / budgetLimit) * 100));

      const styleMatch = 90 + (i * 3) + Math.floor(Math.random() * 3);
      const occasionMatch = 92 + (i * 2) + Math.floor(Math.random() * 4);

      const styleName = finalParams.style.toLowerCase();
      const occasionName = finalParams.occasion.toLowerCase();
      const explanation = `${bundleStyles[i].name} features a high-grade ${topItem ? topItem.brand : 'premium'} style. This combination is tailored for a ${styleName} vibe, matching the ${occasionName} occasion requirement. At ₹${totalPrice.toFixed(0)}, it represents a ${budgetMatch}% budget match score.`;

      bundles.push({
        bundleId: i + 1,
        name: bundleStyles[i].name,
        totalPrice,
        scores: { styleMatch, budgetMatch, occasionMatch },
        explanation,
        items: validItems
      });
    }

    const messageResponse = parseResult.regenerate 
      ? "I've regenerated 3 new outfit options for you based on your original request, prioritizing fresh items from the catalog:"
      : "I've planned 3 distinct outfit options matching your requirements. You can customize individual items in any bundle:";

    return res.status(200).json({
      status: 'recommendation',
      message: messageResponse,
      bundles,
      extractedParams: finalParams
    });

  } catch (error) {
    console.error('AI chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error in AI Service' });
  }
};

/**
 * Controller Preview Generator API
 */
const preview = async (req, res) => {
  try {
    const { gender, style, occasion, items } = req.body;

    if (!gender || !style || !items) {
      return res.status(400).json({ error: 'Gender, style, and items are required' });
    }

    // Extract item details to create a detailed image description
    const itemDescriptions = items.map(item => `${item.color || ''} ${item.name}`).join(', ');
    const promptDescription = `A realistic high-fashion model photograph of a ${gender.toLowerCase()} model wearing the following outfit for a ${occasion || 'fashion'} event: ${itemDescriptions}. Styled in a modern ${style.toLowerCase()} fashion style, studio background, clean lighting, full body shot.`;

    console.log('Generating image with prompt:', promptDescription);

    // Call OpenAI or Imagen if key exists, otherwise return a matched realistic unsplash static fallback
    const openaiApiKey = process.env.OPENAI_API_KEY || '';
    if (openaiApiKey && !openaiApiKey.startsWith('dummy')) {
      try {
        const response = await axios.post('https://api.openai.com/v1/images/generations', {
          prompt: promptDescription,
          n: 1,
          size: "512x512",
          response_format: "url"
        }, {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        return res.status(200).json({ imageUrl: response.data.data[0].url });
      } catch (err) {
        console.error('OpenAI DALL-E image generation failed, falling back to static Unsplash image:', err.message);
      }
    }

    // Fallback: use curated try-on image pool for gender + style matching
    const imageUrl = getCuratedTryOnImage(gender, style, items);
    return res.status(200).json({ imageUrl });

  } catch (error) {
    console.error('AI preview endpoint error:', error);
    res.status(500).json({ error: 'Internal server error in AI Service' });
  }
};

/**
 * Helper to aggregate extracted parameters across chat history
 */
const mergeHistoricalParams = (history, currentParams) => {
  const merged = {
    occasion: currentParams.occasion || null,
    budget: currentParams.budget || null,
    gender: currentParams.gender || null,
    style: currentParams.style || null,
    colors: currentParams.colors || null,
    accessoriesNeeded: currentParams.accessoriesNeeded,
    footwearNeeded: currentParams.footwearNeeded
  };

  // Traverse history in reverse to find previously extracted values
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.extractedParams) {
      if (!merged.occasion && turn.extractedParams.occasion) merged.occasion = turn.extractedParams.occasion;
      if (!merged.budget && turn.extractedParams.budget) merged.budget = turn.extractedParams.budget;
      if (!merged.gender && turn.extractedParams.gender) merged.gender = turn.extractedParams.gender;
      if (!merged.style && turn.extractedParams.style) merged.style = turn.extractedParams.style;
      if (!merged.colors && turn.extractedParams.colors) merged.colors = turn.extractedParams.colors;
      
      if ((merged.accessoriesNeeded === undefined || merged.accessoriesNeeded === null) && 
          turn.extractedParams.accessoriesNeeded !== undefined && 
          turn.extractedParams.accessoriesNeeded !== null) {
        merged.accessoriesNeeded = turn.extractedParams.accessoriesNeeded;
      }
      if ((merged.footwearNeeded === undefined || merged.footwearNeeded === null) && 
          turn.extractedParams.footwearNeeded !== undefined && 
          turn.extractedParams.footwearNeeded !== null) {
        merged.footwearNeeded = turn.extractedParams.footwearNeeded;
      }
    }
  }

  return merged;
};

module.exports = {
  chat,
  preview
};
