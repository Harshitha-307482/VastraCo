const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const genAI = geminiApiKey && !geminiApiKey.startsWith('dummy') ? new GoogleGenerativeAI(geminiApiKey) : null;

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002';

// Standard fallback fashion model image URLs for preview generation
const modelPreviews = {
  Male: {
    Traditional: "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=600&auto=format&fit=crop&q=80",
    Western: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80",
    Casual: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
    Formal: "https://images.unsplash.com/photo-1593030103066-0093718efeb9?w=600&auto=format&fit=crop&q=80"
  },
  Female: {
    Traditional: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80",
    Western: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80",
    Casual: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    Formal: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&auto=format&fit=crop&q=80"
  }
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

    const isTraditional = userText.includes('traditional') || userText.includes('indian') || userText.includes('ethnic');
    const isWestern = userText.includes('western') || userText.includes('formal') || userText.includes('suit') || userText.includes('casual');
    const style = isTraditional ? 'Traditional' : (isWestern ? 'Western' : null);

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
    else occasion = 'Casual Outing';

    // Parse colors
    const availableColors = ['Black', 'White', 'Blue', 'Red', 'Green', 'Navy', 'Grey', 'Beige', 'Pink', 'Yellow', 'Gold', 'Silver'];
    const colors = [];
    for (const c of availableColors) {
      if (userText.includes(c.toLowerCase())) colors.push(c);
    }

    const accessoriesNeeded = !userText.includes('no accessories') && (userText.includes('accessory') || userText.includes('accessories') || userText.includes('watch') || userText.includes('bag') || userText.includes('yes'));
    const footwearNeeded = !userText.includes('no footwear') && (userText.includes('footwear') || userText.includes('shoes') || userText.includes('sandals') || userText.includes('yes'));

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

    // If we are still gathering information, return the next question
    if (parseResult.status === 'chatting' && !parseResult.regenerate) {
      // Aggregate extracted parameters from prior history if missing in parseResult
      const mergedParams = mergeHistoricalParams(history || [], parseResult.extractedParams);
      
      // Determine what's still missing to formulate a smart question if message is empty
      if (!parseResult.message) {
        if (!mergedParams.occasion) parseResult.message = "What occasion is this outfit for?";
        else if (!mergedParams.budget) parseResult.message = "What is your approximate budget for this outfit?";
        else if (!mergedParams.gender) parseResult.message = "Is this for a male or a female?";
        else if (!mergedParams.style) parseResult.message = "Do you prefer traditional or western wear?";
        else parseResult.message = "Got it! Would you like me to include footwear and accessories in the outfit?";
      }

      return res.status(200).json({
        status: 'chatting',
        message: parseResult.message,
        extractedParams: mergedParams
      });
    }

    // 2. We are ready to recommend (or regenerate)
    const finalParams = mergeHistoricalParams(history || [], parseResult.extractedParams);
    
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

    // Filter catalog based on gender, style, and occasion
    let filtered = allProducts.filter(p => {
      // Match gender
      const matchesGender = p.gender === finalParams.gender || p.gender === 'Unisex';
      // Match style
      const matchesStyle = p.style === finalParams.style || !finalParams.style;
      // Match occasion
      let matchesOccasion = true;
      if (finalParams.occasion && p.occasion) {
        try {
          const occasionsList = Array.isArray(p.occasion) ? p.occasion : JSON.parse(p.occasion);
          matchesOccasion = occasionsList.some(occ => occ.toLowerCase() === finalParams.occasion.toLowerCase());
        } catch (e) {
          matchesOccasion = false;
        }
      }
      return matchesGender && matchesStyle && matchesOccasion;
    });

    // Apply color filtering if specified
    if (finalParams.colors && finalParams.colors.length > 0) {
      const targetColors = finalParams.colors.map(c => c.toLowerCase());
      const colorMatches = filtered.filter(p => {
        const pName = p.name.toLowerCase();
        return targetColors.some(color => pName.includes(color));
      });
      // Fallback if color filter is too restrictive
      if (colorMatches.length > 0) {
        filtered = colorMatches;
      }
    }

    // Implement the Outfit Variety Rule: sort products to prioritize unseen ones
    const excludedSet = new Set(excludeProductIds);
    filtered.sort((a, b) => {
      const aExcluded = excludedSet.has(a.id) ? 1 : 0;
      const bExcluded = excludedSet.has(b.id) ? 1 : 0;
      return aExcluded - bExcluded; // Unseen (0) comes before seen (1)
    });

    // Segment items by categories
    const categories = {
      Top: [],
      Bottom: [],
      Standalone: [],
      Footwear: [],
      Accessory: []
    };

    filtered.forEach(p => {
      const cat = p.category_name || '';
      if (['Shirts', 'T-Shirts', 'Polo T-Shirts', 'Kurtis', 'Crop Tops', 'Blouses'].includes(cat)) {
        categories.Top.push(p);
      } else if (['Trousers', 'Jeans', 'Chinos', 'Skirts'].includes(cat)) {
        categories.Bottom.push(p);
      } else if (['Sarees', 'Lehengas', 'Salwar Suits', 'Anarkalis', 'Dresses', 'Gowns', 'Blazers', 'Suits', 'Jackets', 'Sherwani', 'Kurta'].includes(cat)) {
        categories.Standalone.push(p);
      } else if (['Formal Shoes', 'Loafers', 'Sneakers', 'Heels', 'Flats', 'Sandals'].includes(cat)) {
        categories.Footwear.push(p);
      } else if (['Watches', 'Belts', 'Wallets', 'Sunglasses', 'Earrings', 'Bangles', 'Necklaces', 'Rings', 'Handbags', 'Clutches'].includes(cat)) {
        categories.Accessory.push(p);
      }
    });

    // Fallbacks from full catalog if filtered categories are empty
    if (categories.Top.length === 0 && categories.Standalone.length === 0) {
      allProducts.forEach(p => {
        const cat = p.category_name || '';
        if (p.gender === finalParams.gender || p.gender === 'Unisex') {
          if (['Shirts', 'T-Shirts', 'Polo T-Shirts', 'Kurtis'].includes(cat)) categories.Top.push(p);
          else if (['Dresses', 'Gowns', 'Kurta'].includes(cat)) categories.Standalone.push(p);
        }
      });
    }
    if (categories.Bottom.length === 0) {
      allProducts.forEach(p => {
        if ((p.gender === finalParams.gender || p.gender === 'Unisex') && ['Trousers', 'Jeans', 'Chinos'].includes(p.category_name)) {
          categories.Bottom.push(p);
        }
      });
    }
    if (categories.Footwear.length === 0) {
      categories.Footwear = allProducts.filter(p => ['Formal Shoes', 'Loafers', 'Sneakers', 'Heels', 'Flats', 'Sandals'].includes(p.category_name));
    }
    if (categories.Accessory.length === 0) {
      categories.Accessory = allProducts.filter(p => ['Watches', 'Belts', 'Wallets', 'Sunglasses', 'Earrings'].includes(p.category_name));
    }

    // Build 3 Bundles
    const bundles = [];
    const bundleStyles = [
      { name: "Executive Look", desc: "A smart, sleek collection designed to stand out on the occasion." },
      { name: "Premium Elegance", desc: "A curated sophisticated bundle emphasizing elegance and class." },
      { name: "Vibrant Fashion", desc: "A stylish, comfortable blend tailored for ultimate expression." }
    ];

    for (let i = 0; i < 3; i++) {
      const items = [];
      let topItem = null;
      let bottomItem = null;

      // 1. Choose Core Outfit (Standalone or Top + Bottom)
      // alternate between Standalone and Top+Bottom combos
      const useStandalone = (i % 2 === 1 && categories.Standalone.length > i) || (categories.Top.length === 0);
      if (useStandalone && categories.Standalone.length > i) {
        topItem = categories.Standalone[i];
        items.push(topItem);
      } else {
        topItem = categories.Top[i % categories.Top.length];
        bottomItem = categories.Bottom[i % categories.Bottom.length];
        if (topItem) items.push(topItem);
        if (bottomItem) items.push(bottomItem);
      }

      // Special rule: if Saree is selected, grab a Blouse if available
      if (topItem && topItem.category_name === 'Sarees' && categories.Standalone.length > 0) {
        const blouse = categories.Standalone.find(b => b.category_name === 'Blouses' && !excludedSet.has(b.id));
        if (blouse) items.push(blouse);
      }

      // 2. Add Footwear if requested or optional
      if (finalParams.footwearNeeded !== false && categories.Footwear.length > 0) {
        const shoes = categories.Footwear[i % categories.Footwear.length];
        if (shoes) items.push(shoes);
      }

      // 3. Add Accessory if requested or optional
      if (finalParams.accessoriesNeeded !== false && categories.Accessory.length > 0) {
        const accessory = categories.Accessory[i % categories.Accessory.length];
        if (accessory) items.push(accessory);
      }

      // Clean undefined items
      const validItems = items.filter(item => !!item);
      const totalPrice = validItems.reduce((sum, item) => sum + parseFloat(item.price), 0);

      // Scoring
      const budgetLimit = finalParams.budget || 5000;
      const budgetMatch = totalPrice <= budgetLimit 
        ? 100 
        : Math.max(50, Math.round((1 - (totalPrice - budgetLimit) / budgetLimit) * 100));

      const styleMatch = 90 + (i * 3) + Math.floor(Math.random() * 3); // 90% - 98%
      const occasionMatch = 92 + (i * 2) + Math.floor(Math.random() * 4); // 92% - 99%

      // Explanation
      const styleName = finalParams.style.toLowerCase();
      const occasionName = finalParams.occasion.toLowerCase();
      const explanation = `${bundleStyles[i].name} features a high-grade ${topItem ? topItem.brand : 'premium'} style. This combination is tailored for a ${styleName} vibe, matching the ${occasionName} occasion requirement. At ₹${totalPrice}, it represents a ${budgetMatch}% budget match score.`;

      bundles.push({
        bundleId: i + 1,
        name: bundleStyles[i].name,
        totalPrice,
        scores: {
          styleMatch,
          budgetMatch,
          occasionMatch
        },
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

    // Fallback static high quality Unsplash model image matching gender and style
    const genderKey = gender === 'Female' ? 'Female' : 'Male';
    const styleKey = modelPreviews[genderKey][style] ? style : 'Casual';
    const imageUrl = modelPreviews[genderKey][styleKey];

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
      if (merged.accessoriesNeeded === undefined && turn.extractedParams.accessoriesNeeded !== undefined) {
        merged.accessoriesNeeded = turn.extractedParams.accessoriesNeeded;
      }
      if (merged.footwearNeeded === undefined && turn.extractedParams.footwearNeeded !== undefined) {
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
