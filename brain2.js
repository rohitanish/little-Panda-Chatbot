function doGet(e) {
  try {
    var userInput = e.parameter.question || '';
    var feedback = e.parameter.feedback || '';
    var answerRowIndex = e.parameter.answerRow || '';
    
    // Handle feedback submission
    if (feedback && answerRowIndex) {
      recordFeedback(answerRowIndex, feedback, userInput);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          message: "Thank you for your feedback!"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle regular question
    if (!userInput.trim()) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: "Please provide a question"
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var result = findAnswer(userInput.toLowerCase());
    
    if (typeof result === 'string') {
      result = {
        answer: result,
        rowIndex: -1,
        confidence: 0
      };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        answer: result.answer,
        input: userInput,
        answerRowIndex: result.rowIndex,
        confidence: result.confidence,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: "Error: " + error.toString(),
        debug: {
          userInput: e.parameter.question || 'undefined',
          feedback: e.parameter.feedback || 'undefined',
          answerRow: e.parameter.answerRow || 'undefined'
        }
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function findAnswer(userInput) {
  // Clean and normalize user input
  var cleanInput = normalizeInput(userInput);
  
  // Check for conversational responses first
  var conversationalResponse = handleConversationalInput(cleanInput);
  if (conversationalResponse) {
    logQuestionAnswer(userInput, conversationalResponse, 0);
    return {
      answer: conversationalResponse,
      rowIndex: 0,
      confidence: 95
    };
  }
  
  // Load data from Google Sheet
  var sheet = SpreadsheetApp.openById('1tzytt4G2U6dYG42qM01y4WucFhlJeNwRDLXHjFugMeQ').getActiveSheet();
  var data = sheet.getDataRange().getValues();
  
  var matches = [];
  var userTokens = tokenizeInput(cleanInput);
  
  // Process each row in the sheet
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] || !data[i][1]) continue; // Skip empty rows
    
    var keywords = data[i][0].toLowerCase().split(',').map(k => k.trim()).filter(k => k);
    var answer = data[i][1];
    var category = data[i][2] || '';
    
    var score = calculateComprehensiveScore(cleanInput, userTokens, keywords, category, answer);
    
    if (score > 0) {
      matches.push({
        score: score,
        answer: answer,
        rowIndex: i + 1,
        category: category,
        keywords: keywords
      });
    }
  }
  
  // Sort matches by score (descending)
  matches.sort((a, b) => b.score - a.score);
  
  // Return best match if confidence is high enough
  if (matches.length > 0 && matches[0].score >= 30) {
    var bestMatch = matches[0];
    var confidence = Math.min(95, Math.max(60, bestMatch.score));
    
    logQuestionAnswer(userInput, bestMatch.answer, bestMatch.rowIndex);
    return {
      answer: bestMatch.answer,
      rowIndex: bestMatch.rowIndex,
      confidence: confidence
    };
  }
  
  // Try fuzzy matching for potential typos
  var fuzzyResult = tryFuzzyMatching(cleanInput, userTokens, data);
  if (fuzzyResult) {
    logQuestionAnswer(userInput, fuzzyResult.answer, fuzzyResult.rowIndex);
    return fuzzyResult;
  }
  
  // Log failed query
  logQuestionAnswer(userInput, "No answer found", -1);
  
  return {
    answer: generateHelpfulNoAnswerResponse(userInput),
    rowIndex: -1,
    confidence: 0
  };
}

function normalizeInput(input) {
  return input.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeInput(input) {
  var tokens = input.split(' ').filter(token => token.length > 1);
  var expandedTokens = [];
  
  // Add original tokens
  expandedTokens = expandedTokens.concat(tokens);
  
  // Add word variations and synonyms
  for (var i = 0; i < tokens.length; i++) {
    var variations = getWordVariations(tokens[i]);
    expandedTokens = expandedTokens.concat(variations);
  }
  
  // Add n-grams (2-grams and 3-grams)
  for (var i = 0; i < tokens.length - 1; i++) {
    expandedTokens.push(tokens[i] + '_' + tokens[i + 1]);
    if (i < tokens.length - 2) {
      expandedTokens.push(tokens[i] + '_' + tokens[i + 1] + '_' + tokens[i + 2]);
    }
  }
  
  return [...new Set(expandedTokens)]; // Remove duplicates
}

function calculateComprehensiveScore(input, userTokens, keywords, category, answer) {
  var score = 0;
  var matchedKeywords = 0;
  var exactMatches = 0;
  
  // 1. CRITICAL: Exact phrase matching with highest priority
  var criticalPhrases = extractCriticalPhrases(input);
  
  for (var i = 0; i < criticalPhrases.length; i++) {
    var phrase = criticalPhrases[i];
    
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j].trim();
      if (!keyword) continue;
      
      // Check if keyword contains the critical phrase
      if (keyword.includes(phrase)) {
        // Massive score boost for critical phrase matches
        score += 100;
        exactMatches++;
        
        // Extra boost for longer critical phrases
        if (phrase.length > 10) {
          score += 50;
        }
      }
    }
  }
  
  // 2. Enhanced exact phrase matching
  for (var i = 0; i < keywords.length; i++) {
    var keyword = keywords[i].trim();
    if (!keyword) continue;
    
    if (input.includes(keyword)) {
      if (keyword.length > 15) {
        score += 70;
      } else if (keyword.length > 10) {
        score += 55;
      } else if (keyword.length > 5) {
        score += 40;
      } else {
        score += 30;
      }
      exactMatches++;
    }
  }
  
  // 3. Multi-word compound keyword matching
  score += calculateCompoundKeywordScore(input, keywords);
  
  // 4. Enhanced token-based matching
  for (var i = 0; i < userTokens.length; i++) {
    var userToken = userTokens[i];
    
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j].trim();
      if (!keyword) continue;
      
      var tokenScore = calculateAdvancedTokenScore(userToken, keyword);
      if (tokenScore > 0) {
        score += tokenScore;
        matchedKeywords++;
      }
    }
  }
  
  // 5. Context and semantic matching
  score += calculateContextualScore(input, keywords, category);
  
  // 6. Intent recognition
  score += calculateIntentScore(input, keywords, category);
  
  // 7. Specific domain bonuses
  score += calculateDomainSpecificBonus(input, keywords, category);
  
  // 8. Relevance penalties
  score -= calculateRelevancePenalty(input, keywords, category);
  
  // 9. Critical: Penalty for wrong category matches
  score -= calculateCategoryMismatchPenalty(input, keywords, category);
  
  return Math.max(0, score);
}

function calculateIntentScore(input, keywords, category) {
  var score = 0;
  
  var intentPatterns = {
    'information_seeking': {
      patterns: ['what', 'how', 'when', 'where', 'why', 'which', 'tell me', 'can you', 'do you'],
      bonus: 10
    },
    'capability_inquiry': {
      patterns: ['equipped to', 'can handle', 'able to', 'support for', 'cater to'],
      bonus: 15
    },
    'process_inquiry': {
      patterns: ['how to', 'process', 'procedure', 'steps', 'method', 'way to'],
      bonus: 12
    },
    'availability': {
      patterns: ['do you have', 'is there', 'available', 'offer', 'provide'],
      bonus: 12
    }
  };
  
  for (var intent in intentPatterns) {
    var intentData = intentPatterns[intent];
    var patternMatched = intentData.patterns.some(pattern => input.includes(pattern));
    
    if (patternMatched) {
      score += intentData.bonus;
    }
  }
  
  return score;
}

function calculateContextualScore(input, keywords, category) {
  var score = 0;
  
  // Context mapping with better precision
  var contextMappings = {
    'special_needs_context': {
      input_patterns: ['clinically diagnosed', 'adhd', 'autism', 'special needs', 'equipped', 'cater', 'differently abled'],
      keyword_patterns: ['special_needs', 'autism_support', 'adhd_support', 'special_education', 'clinically_diagnosed'],
      weight: 35
    },
    'payment_context': {
      input_patterns: ['pay fees', 'installments', 'payment', 'installment payment', 'can i pay', 'payment process'],
      keyword_patterns: ['payment_process', 'payment_modes', 'installments', 'payment_procedure'],
      weight: 30
    },
    'behavior_context': {
      input_patterns: ['classroom behavior', 'behavior management', 'manage behavior', 'discipline', 'behavioral guidance'],
      keyword_patterns: ['behavior_management', 'classroom_discipline', 'behavior_handling', 'discipline_approach'],
      weight: 30
    },
    'methodology_context': {
      input_patterns: ['teaching methodology', 'teaching approach', 'learning methodology', 'educational philosophy'],
      keyword_patterns: ['teaching_methods', 'learning_methodology', 'teaching_approach', 'educational_philosophy'],
      weight: 30
    }
  };
  
  for (var context in contextMappings) {
    var mapping = contextMappings[context];
    var inputMatches = 0;
    var keywordMatches = 0;
    
    // Check input patterns
    for (var i = 0; i < mapping.input_patterns.length; i++) {
      if (input.includes(mapping.input_patterns[i])) {
        inputMatches++;
      }
    }
    
    // Check keyword patterns
    for (var i = 0; i < mapping.keyword_patterns.length; i++) {
      var pattern = mapping.keyword_patterns[i];
      var hasKeywordPattern = keywords.some(k => k.includes(pattern)) || category.includes(pattern);
      if (hasKeywordPattern) {
        keywordMatches++;
      }
    }
    
    // Calculate context score
    if (inputMatches > 0 && keywordMatches > 0) {
      score += mapping.weight * Math.min(inputMatches, 2) * Math.min(keywordMatches, 2);
    }
  }
  
  return score;
}

function calculateCategoryMismatchPenalty(input, keywords, category) {
  var penalty = 0;
  
  var mismatchPatterns = {
    'special_needs_query': {
      input_indicators: ['clinically diagnosed', 'adhd', 'autism', 'special needs', 'equipped to cater'],
      wrong_categories: ['school_visit', 'age_groups', 'contact_information', 'fee_structure', 'transport'],
      penalty: 80
    },
    'payment_query': {
      input_indicators: ['pay fees', 'installments', 'payment process', 'installment payment'],
      wrong_categories: ['fee_structure', 'school_visit', 'age_groups', 'contact_information'],
      penalty: 70
    },
    'behavior_query': {
      input_indicators: ['classroom behavior', 'behavior management', 'manage behavior', 'discipline'],
      wrong_categories: ['age_groups', 'school_visit', 'contact_information', 'fee_structure'],
      penalty: 75
    },
    'teaching_query': {
      input_indicators: ['teaching methodology', 'teaching approach', 'learning methodology', 'how do you teach'],
      wrong_categories: ['age_groups', 'school_visit', 'contact_information', 'fee_structure'],
      penalty: 70
    }
  };
  
  for (var queryType in mismatchPatterns) {
    var pattern = mismatchPatterns[queryType];
    var hasInputIndicator = pattern.input_indicators.some(indicator => input.includes(indicator));
    var hasWrongCategory = pattern.wrong_categories.some(wrongCat => category.includes(wrongCat));
    
    if (hasInputIndicator && hasWrongCategory) {
      penalty += pattern.penalty;
    }
  }
  
  return penalty;
}

function calculateDomainSpecificBonus(input, keywords, category) {
  var bonus = 0;
  
  var domainPatterns = {
    'special_needs': {
      input_indicators: ['clinically diagnosed', 'adhd', 'autism', 'special needs', 'equipped to cater', 'differently abled', 'specially abled'],
      category_indicators: ['special_needs', 'autism_support', 'adhd_support'],
      bonus: 50
    },
    'payment_process': {
      input_indicators: ['pay fees', 'installments', 'payment', 'installment payment', 'can i pay', 'payment process', 'payment procedure'],
      category_indicators: ['payment_process', 'payment_modes', 'installments'],
      bonus: 45
    },
    'behavior_management': {
      input_indicators: ['classroom behavior', 'behavior management', 'manage behavior', 'discipline', 'behavioral guidance'],
      category_indicators: ['behavior_management', 'classroom_discipline', 'behavior_handling'],
      bonus: 45
    },
    'teaching_methodology': {
      input_indicators: ['teaching methodology', 'teaching approach', 'learning methodology', 'educational philosophy', 'how do you teach'],
      category_indicators: ['teaching_methods', 'learning_methodology', 'teaching_approach'],
      bonus: 40
    }
  };
  
  for (var domain in domainPatterns) {
    var pattern = domainPatterns[domain];
    var hasInputIndicator = pattern.input_indicators.some(indicator => input.includes(indicator));
    var hasCategoryIndicator = pattern.category_indicators.some(indicator => 
      category.includes(indicator) || keywords.some(k => k.includes(indicator))
    );
    
    if (hasInputIndicator && hasCategoryIndicator) {
      bonus += pattern.bonus;
    }
  }
  
  return bonus;
}


function extractCriticalPhrases(input) {
  var criticalPhrases = [
    'clinically diagnosed adhd',
    'clinically diagnosed autism',
    'equipped to cater',
    'pay fees in installments',
    'installment payment',
    'classroom behavior',
    'behavior management',
    'manage behavior',
    'discipline approach',
    'behavioral guidance',
    'teaching methodology',
    'teaching approach',
    'learning methodology',
    'educational philosophy',
    'special needs support',
    'autism support',
    'adhd support',
    'differently abled',
    'specially abled'
  ];
  
  var foundPhrases = [];
  
  for (var i = 0; i < criticalPhrases.length; i++) {
    if (input.includes(criticalPhrases[i])) {
      foundPhrases.push(criticalPhrases[i]);
    }
  }
  
  return foundPhrases;
}

function calculateCompoundKeywordScore(input, keywords) {
  var score = 0;
  
  // Look for compound keywords (with underscores)
  var compoundKeywords = keywords.filter(k => k.includes('_'));
  
  for (var i = 0; i < compoundKeywords.length; i++) {
    var compound = compoundKeywords[i];
    var parts = compound.split('_');
    var matchedParts = 0;
    
    for (var j = 0; j < parts.length; j++) {
      if (input.includes(parts[j])) {
        matchedParts++;
      }
    }
    
    // Score based on how many parts matched
    if (matchedParts === parts.length) {
      score += 80; // All parts matched
    } else if (matchedParts > parts.length / 2) {
      score += 40; // Majority matched
    } else if (matchedParts > 0) {
      score += 20; // Some parts matched
    }
  }
  
  return score;
}


function calculateTokenScore(userToken, keyword) {
  var score = 0;
  
  // Exact match
  if (userToken === keyword) {
    score = 30;
  }
  // Substring matches
  else if (userToken.includes(keyword) && keyword.length > 3) {
    score = 25;
  }
  else if (keyword.includes(userToken) && userToken.length > 3) {
    score = 20;
  }
  // Handle compound keywords
  else if (keyword.includes('_')) {
    var parts = keyword.split('_');
    var partMatches = 0;
    
    for (var i = 0; i < parts.length; i++) {
      if (userToken.includes(parts[i]) || parts[i].includes(userToken)) {
        partMatches++;
      }
    }
    
    if (partMatches === parts.length) {
      score = 35;
    } else if (partMatches > 0) {
      score = 10 + (partMatches * 8);
    }
  }
  // Fuzzy matching
  else if (calculateSimilarity(userToken, keyword) > 0.85) {
    score = 18;
  }
  // Common spelling variations
  else if (isSpellingVariation(userToken, keyword)) {
    score = 22;
  }
  
  return score;
}

function calculateAdvancedTokenScore(userToken, keyword) {
  var score = 0;
  
  // Exact match gets highest score
  if (userToken === keyword) {
    score = 40;
  }
  // Handle compound keywords
  else if (keyword.includes('_')) {
    var parts = keyword.split('_');
    var partMatches = 0;
    
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (userToken === part) {
        partMatches++;
        score += 35;
      } else if (userToken.includes(part) && part.length > 3) {
        partMatches++;
        score += 25;
      } else if (part.includes(userToken) && userToken.length > 3) {
        partMatches++;
        score += 20;
      }
    }
    
    // Bonus for matching multiple parts
    if (partMatches > 1) {
      score += partMatches * 10;
    }
  }
  // Substring matches
  else if (userToken.includes(keyword) && keyword.length > 3) {
    score = 30;
  }
  else if (keyword.includes(userToken) && userToken.length > 3) {
    score = 25;
  }
  // Fuzzy matching
  else if (calculateSimilarity(userToken, keyword) > 0.85) {
    score = 22;
  }
  
  return score;
}

function calculateSemanticScore(input, keywords, category) {
  var score = 0;
  
  var semanticMappings = {
    'fees': ['cost', 'price', 'charges', 'payment', 'money', 'tuition', 'amount', 'billing'],
    'timing': ['schedule', 'time', 'hours', 'duration', 'when', 'start', 'end'],
    'curriculum': ['syllabus', 'subjects', 'teaching', 'learning', 'education', 'academic'],
    'facilities': ['amenities', 'infrastructure', 'campus', 'playground', 'rooms', 'equipment'],
    'transport': ['bus', 'van', 'pickup', 'drop', 'vehicle', 'conveyance'],
    'teachers': ['staff', 'faculty', 'instructors', 'educators', 'teaching', 'qualification'],
    'admission': ['enrollment', 'registration', 'join', 'apply', 'application'],
    'safety': ['security', 'protection', 'safe', 'secure', 'emergency'],
    'food': ['meals', 'lunch', 'breakfast', 'nutrition', 'eating', 'snacks'],
    'assessment': ['exam', 'test', 'evaluation', 'progress', 'grading'],
    'communication': ['updates', 'information', 'contact', 'whatsapp', 'meeting'],
    'special_needs': ['autism', 'adhd', 'special', 'disability', 'support'],
    'activities': ['sports', 'music', 'art', 'creative', 'games', 'events'],
    'health': ['medical', 'fever', 'illness', 'sick', 'hygiene'],
    'daycare': ['fullday', 'extended', 'hours', 'care', 'supervision']
  };
  
  for (var concept in semanticMappings) {
    var relatedWords = semanticMappings[concept];
    var conceptInInput = input.includes(concept) || relatedWords.some(word => input.includes(word));
    
    if (conceptInInput) {
      var keywordRelevance = keywords.some(keyword => {
        return keyword.includes(concept) || 
               relatedWords.some(word => keyword.includes(word)) ||
               category.includes(concept);
      });
      
      if (keywordRelevance) {
        score += 25;
      }
    }
  }
  
  return score;
}

function calculateIntentScore(input, keywords, category) {
  var score = 0;
  
  var intentPatterns = {
    'information_seeking': {
      patterns: ['what', 'how', 'when', 'where', 'why', 'which', 'tell me', 'can you', 'do you'],
      bonus: 10
    },
    'comparison': {
      patterns: ['difference', 'compare', 'better', 'best', 'versus', 'vs', 'or'],
      bonus: 8
    },
    'procedural': {
      patterns: ['how to', 'steps', 'process', 'procedure', 'method', 'way'],
      bonus: 12
    },
    'availability': {
      patterns: ['do you have', 'is there', 'available', 'offer', 'provide'],
      bonus: 15
    },
    'scheduling': {
      patterns: ['when', 'time', 'schedule', 'timing', 'hours', 'duration'],
      bonus: 12
    },
    'cost_inquiry': {
      patterns: ['cost', 'price', 'fees', 'charges', 'expensive', 'cheap', 'affordable'],
      bonus: 15
    }
  };
  
  for (var intent in intentPatterns) {
    var intentData = intentPatterns[intent];
    var patternMatched = intentData.patterns.some(pattern => input.includes(pattern));
    
    if (patternMatched) {
      score += intentData.bonus;
    }
  }
  
  return score;
}

function calculateEnhancedTokenScore(userToken, keyword) {
  var score = 0;
  
  // Exact match (highest priority)
  if (userToken === keyword) {
    score = 35;
  }
  // Handle compound keywords with underscores
  else if (keyword.includes('_')) {
    var parts = keyword.split('_');
    var partMatches = 0;
    var totalParts = parts.length;
    
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (userToken === part) {
        partMatches++;
        score += 30; // High score for exact part matches
      } else if (userToken.includes(part) && part.length > 2) {
        partMatches++;
        score += 20;
      } else if (part.includes(userToken) && userToken.length > 2) {
        partMatches++;
        score += 15;
      }
    }
    
    // Bonus for matching multiple parts
    if (partMatches > 1) {
      score += (partMatches - 1) * 10;
    }
  }
  // Substring matches
  else if (userToken.includes(keyword) && keyword.length > 3) {
    score = 25;
  }
  else if (keyword.includes(userToken) && userToken.length > 3) {
    score = 20;
  }
  // Fuzzy matching for typos
  else if (calculateSimilarity(userToken, keyword) > 0.85) {
    score = 18;
  }
  // Common spelling variations
  else if (isSpellingVariation(userToken, keyword)) {
    score = 22;
  }
  
  return score;
}


function calculateComprehensiveScore(input, userTokens, keywords, category, answer) {
  var score = 0;
  var matchedKeywords = 0;
  var exactMatches = 0;
  var partialMatches = 0;
  
  // 1. ENHANCED: Exact phrase matching with better prioritization
  for (var i = 0; i < keywords.length; i++) {
    var keyword = keywords[i].trim();
    if (!keyword) continue;
    
    if (input.includes(keyword)) {
      if (keyword.length > 15) {
        score += 60; // Very long exact phrases get highest score
      } else if (keyword.length > 10) {
        score += 50; 
      } else if (keyword.length > 5) {
        score += 35;
      } else {
        score += 25;
      }
      exactMatches++;
      
      // BONUS: Extra points for multi-word exact matches
      if (keyword.includes('_') || keyword.includes(' ')) {
        score += 15;
      }
    }
  }
  
  // 2. ENHANCED: Token-based matching with better precision
  for (var i = 0; i < userTokens.length; i++) {
    var userToken = userTokens[i];
    
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j].trim();
      if (!keyword) continue;
      
      var tokenScore = calculateEnhancedTokenScore(userToken, keyword);
      if (tokenScore > 0) {
        score += tokenScore;
        matchedKeywords++;
      }
    }
  }
  
  // 3. ENHANCED: Better semantic similarity
  score += calculateEnhancedSemanticScore(input, keywords, category);
  
  // 4. Intent recognition (keep existing)
  score += calculateIntentScore(input, keywords, category);
  
  // 5. ENHANCED: Context-aware bonuses with better category matching
  score += calculateEnhancedContextBonus(input, keywords, category, exactMatches, partialMatches);
  
  // 6. ENHANCED: More precise relevance penalties
  score -= calculateEnhancedRelevancePenalty(input, keywords, category);
  
  // 7. Answer quality bonus (keep existing)
  score += calculateAnswerQualityBonus(input, answer);
  
  // 8. NEW: Specificity bonus for complex queries
  score += calculateSpecificityBonus(input, keywords, category);
  
  return Math.max(0, score);
}
function calculateSpecificityBonus(input, keywords, category) {
  var bonus = 0;
  
  // Bonus for specific, detailed queries
  var specificityIndicators = [
    'clinically diagnosed', 'equipped to cater', 'methodology you follow',
    'teaching approach', 'special needs support', 'adhd support',
    'autism support', 'learning methodology', 'educational philosophy'
  ];
  
  for (var i = 0; i < specificityIndicators.length; i++) {
    if (input.includes(specificityIndicators[i])) {
      bonus += 20;
    }
  }
  
  // Bonus for professional terminology
  var professionalTerms = ['clinically', 'diagnosed', 'methodology', 'pedagogy', 'curriculum', 'assessment'];
  var professionalMatches = professionalTerms.filter(term => input.includes(term)).length;
  bonus += professionalMatches * 8;
  
  return bonus;
}


function calculateEnhancedContextBonus(input, keywords, category, exactMatches, partialMatches) {
  var bonus = 0;
  
  // Multi-keyword bonus (enhanced)
  if (exactMatches > 1) {
    bonus += exactMatches * 12;
  }
  
  // Category relevance bonus (enhanced)
  if (category) {
    var categoryWords = category.split('_');
    var categoryMatches = 0;
    
    for (var i = 0; i < categoryWords.length; i++) {
      if (input.includes(categoryWords[i])) {
        categoryMatches++;
        bonus += 15;
      }
    }
    
    // Bonus for matching multiple category words
    if (categoryMatches > 1) {
      bonus += categoryMatches * 5;
    }
  }
  
  // Question type bonus (enhanced)
  var questionWords = ['what', 'how', 'when', 'where', 'why', 'which', 'do', 'does', 'can', 'will'];
  var questionMatches = questionWords.filter(word => input.includes(word)).length;
  if (questionMatches > 0) {
    bonus += questionMatches * 8;
  }
  
  // Specificity bonus for longer, more detailed queries
  if (input.length > 30) {
    bonus += 10;
  }
  
  return bonus;
}

function calculateEnhancedRelevancePenalty(input, keywords, category) {
  var penalty = 0;
  
  // Penalize very short inputs
  if (input.length < 5) {
    penalty += 15;
  }
  
  // Enhanced context mismatch detection
  var contextMismatches = {
    'teaching_methodology': {
      indicators: ['teaching', 'methodology', 'method', 'approach', 'instruction'],
      avoid_categories: ['transport', 'fee_structure', 'contact_information', 'food_policy'],
      penalty: 25
    },
    'special_needs': {
      indicators: ['special', 'needs', 'autism', 'adhd', 'equipped', 'cater', 'diagnosed'],
      avoid_categories: ['transport', 'fee_structure', 'school_visit', 'contact_information'],
      penalty: 30
    },
    'food_queries': {
      indicators: ['food', 'meal', 'lunch', 'breakfast', 'eat'],
      avoid_categories: ['transport', 'fee_structure', 'contact_information', 'school_visit'],
      penalty: 20
    },
    'transport_queries': {
      indicators: ['transport', 'bus', 'van', 'pickup', 'drop'],
      avoid_categories: ['food_policy', 'curriculum', 'assessment', 'special_needs'],
      penalty: 20
    }
  };
  
  for (var context in contextMismatches) {
    var contextData = contextMismatches[context];
    var hasIndicator = contextData.indicators.some(indicator => input.includes(indicator));
    
    if (hasIndicator && contextData.avoid_categories.some(cat => category.includes(cat))) {
      penalty += contextData.penalty;
    }
  }
  
  return penalty;
}


function calculateEnhancedSemanticScore(input, keywords, category) {
  var score = 0;
  
  var enhancedSemanticMappings = {
    'teaching_methodology': {
      concepts: ['teaching', 'methodology', 'method', 'approach', 'instruction', 'pedagogy'],
      related: ['kreedo', 'montessori', 'play_based', 'hands_on', 'learning_approach', 'educational_philosophy'],
      weight: 30
    },
    'special_needs': {
      concepts: ['special', 'needs', 'autism', 'adhd', 'disability', 'equipped', 'cater', 'diagnosed'],
      related: ['special_education', 'inclusive', 'support', 'specially_abled', 'differently_abled'],
      weight: 35
    },
    'fees_structure': {
      concepts: ['fees', 'cost', 'price', 'charges', 'payment', 'money', 'tuition'],
      related: ['fee_structure', 'annual_fees', 'installments', 'payment_modes'],
      weight: 25
    },
    'school_timing': {
      concepts: ['timing', 'schedule', 'time', 'hours', 'duration', 'session'],
      related: ['school_hours', 'batch_timings', 'start_time', 'end_time'],
      weight: 25
    },
    'transport_services': {
      concepts: ['transport', 'bus', 'van', 'pickup', 'drop', 'vehicle'],
      related: ['school_transport', 'transport_services', 'pickup_service'],
      weight: 25
    }
  };
  
  for (var domain in enhancedSemanticMappings) {
    var mapping = enhancedSemanticMappings[domain];
    var conceptMatches = 0;
    var relatedMatches = 0;
    
    // Check for concept matches in input
    for (var i = 0; i < mapping.concepts.length; i++) {
      if (input.includes(mapping.concepts[i])) {
        conceptMatches++;
      }
    }
    
    // Check for related matches in keywords and category
    for (var i = 0; i < mapping.related.length; i++) {
      var relatedTerm = mapping.related[i];
      var keywordHasRelated = keywords.some(keyword => keyword.includes(relatedTerm));
      var categoryHasRelated = category.includes(relatedTerm);
      
      if (keywordHasRelated || categoryHasRelated) {
        relatedMatches++;
      }
    }
    
    // Calculate domain score
    if (conceptMatches > 0 && relatedMatches > 0) {
      score += mapping.weight * Math.min(conceptMatches, 2) * Math.min(relatedMatches, 2);
    }
  }
  
  return score;
}

function calculateRelevancePenalty(input, keywords, category) {
  var penalty = 0;
  
  // Penalize very short inputs
  if (input.length < 5) {
    penalty += 15;
  }
  
  // Penalize generic mismatches
  var genericMismatches = {
    'transport_in_food': {
      input_indicators: ['transport', 'bus', 'van'],
      wrong_categories: ['food_policy', 'meal_supervision'],
      penalty: 25
    },
    'food_in_transport': {
      input_indicators: ['food', 'meal', 'lunch'],
      wrong_categories: ['transport', 'pickup_procedure'],
      penalty: 25
    }
  };
  
  for (var mismatch in genericMismatches) {
    var data = genericMismatches[mismatch];
    var hasIndicator = data.input_indicators.some(indicator => input.includes(indicator));
    var hasWrongCategory = data.wrong_categories.some(cat => category.includes(cat));
    
    if (hasIndicator && hasWrongCategory) {
      penalty += data.penalty;
    }
  }
  
  return penalty;
}

function calculateAnswerQualityBonus(input, answer) {
  var bonus = 0;
  
  // Bonus for comprehensive answers
  if (answer.length > 200) {
    bonus += 5;
  }
  
  // Bonus for answers with contact information
  if (answer.includes('whatsapp') || answer.includes('contact') || answer.includes('phone')) {
    bonus += 3;
  }
  
  // Bonus for answers with specific details
  if (answer.includes('₹') || answer.includes('time') || answer.includes('hours')) {
    bonus += 3;
  }
  
  return bonus;
}

function tryFuzzyMatching(input, userTokens, data) {
  var fuzzyThreshold = 0.8; // Increased threshold for better precision
  var bestFuzzyMatch = null;
  var bestFuzzyScore = 0;
  
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0] || !data[i][1]) continue;
    
    var keywords = data[i][0].toLowerCase().split(',').map(k => k.trim()).filter(k => k);
    var answer = data[i][1];
    var category = data[i][2] || '';
    
    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j];
      
      // Skip very short keywords in fuzzy matching
      if (keyword.length < 4) continue;
      
      for (var k = 0; k < userTokens.length; k++) {
        var userToken = userTokens[k];
        
        // Skip very short tokens
        if (userToken.length < 4) continue;
        
        var similarity = calculateSimilarity(userToken, keyword);
        
        if (similarity > fuzzyThreshold && similarity > bestFuzzyScore) {
          bestFuzzyScore = similarity;
          bestFuzzyMatch = {
            answer: answer,
            rowIndex: i + 1,
            confidence: Math.floor(similarity * 75) // Adjusted confidence calculation
          };
        }
      }
    }
  }
  
  return bestFuzzyMatch;
}

function getWordVariations(word) {
  var variations = [];
  
  // Common transformations
  var transformations = {
    'fees': ['fee', 'cost', 'price', 'charges'],
    'timing': ['time', 'schedule', 'hours'],
    'teachers': ['teacher', 'staff', 'faculty'],
    'facilities': ['facility', 'amenities'],
    'activities': ['activity', 'events'],
    'curriculum': ['syllabus', 'subjects'],
    'admission': ['enrollment', 'registration'],
    'transport': ['bus', 'van', 'pickup'],
    'daycare': ['fullday', 'extended_hours'],
    'assessment': ['exam', 'test', 'evaluation']
  };
  
  if (transformations[word]) {
    variations = variations.concat(transformations[word]);
  }
  
  // Add pluralization variations
  if (word.endsWith('s')) {
    variations.push(word.slice(0, -1));
  } else {
    variations.push(word + 's');
  }
  
  return variations;
}

function isSpellingVariation(userWord, keyword) {
  var commonMistakes = {
    'curiculum': 'curriculum',
    'curriculam': 'curriculum',
    'ciriculum': 'curriculum',
    'fess': 'fees',
    'phees': 'fees',
    'trasport': 'transport',
    'transprot': 'transport',
    'timming': 'timing',
    'timmings': 'timings',
    'assesment': 'assessment',
    'admision': 'admission',
    'payement': 'payment',
    'shedule': 'schedule',
    'facilty': 'facility',
    'facilites': 'facilities',
    'emergancy': 'emergency',
    'techers': 'teachers',
    'speical': 'special',
    'specail': 'special',
    'enrol': 'enroll',
    'enrollment': 'enroll'
  };
  
  return (commonMistakes[userWord] === keyword) || 
         (commonMistakes[keyword] === userWord);
}

function generateHelpfulNoAnswerResponse(input) {
  var response = "I couldn't find a specific answer to your question. ";
  
  // Analyze input to suggest related topics
  var suggestions = [];
  
  if (input.includes('fee') || input.includes('cost') || input.includes('price')) {
    suggestions.push('fee structure and payment options');
  }
  if (input.includes('time') || input.includes('schedule') || input.includes('hour')) {
    suggestions.push('school timings and daily routines');
  }
  if (input.includes('teacher') || input.includes('staff')) {
    suggestions.push('teacher qualifications and student-teacher ratios');
  }
  if (input.includes('food') || input.includes('meal') || input.includes('lunch')) {
    suggestions.push('meal facilities and food policies');
  }
  if (input.includes('transport') || input.includes('bus') || input.includes('van')) {
    suggestions.push('transport services and pickup/drop facilities');
  }
  if (input.includes('admission') || input.includes('enroll') || input.includes('join')) {
    suggestions.push('admission process and enrollment procedures');
  }
  
  if (suggestions.length > 0) {
    response += "You might be interested in: " + suggestions.join(', ') + ". ";
  }
  
  response += "You can ask me about:\n";
  response += "• Fee Structure & Payment Options\n";
  response += "• Admission Process & Requirements\n";
  response += "• School Timings & Daily Routines\n";
  response += "• Curriculum & Teaching Methods\n";
  response += "• Transport Services\n";
  response += "• Teacher Qualifications & Ratios\n";
  response += "• Meal Facilities & Food Policies\n";
  response += "• Safety & Emergency Procedures\n";
  response += "• Special Needs Support\n";
  response += "• Events & Activities\n";
  response += "• Contact Information\n\n";
  
  response += "For personalized assistance, please <a href='https://api.whatsapp.com/send/?phone=918600600033&text&type=phone_number&app_absent=0' target='_blank'>contact us on WhatsApp</a> 📱";
  
  return response;
}

function handleConversationalInput(cleanInput) {
  var conversationalPatterns = {
    greetings: {
      patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hii', 'helo'],
      responses: [
        "Hello! Welcome to Little Panda Preschool! 🐼 I'm here to help you with any questions about our programs, fees, admissions, or facilities. What would you like to know?",
        "Hi there! Great to see you! I can provide information about our curriculum, timings, teacher qualifications, and much more. How can I assist you today?",
        "Hello! Welcome! I'm your Little Panda assistant ready to help with questions about our preschool. Feel free to ask about anything!"
      ]
    },
    
    wellbeing: {
      patterns: ['how are you', 'how r u', 'whats up', 'how do you do'],
      responses: [
        "I'm doing wonderfully, thank you! 😊 I'm excited to help you learn more about Little Panda Preschool. What information can I provide for you?",
        "I'm great! Always happy to help parents and families find the perfect preschool experience. What would you like to know about our school?",
        "I'm fantastic! Ready to answer all your questions about Little Panda Preschool. How can I help you today?"
      ]
    },
    
    gratitude: {
      patterns: ['thank you', 'thanks', 'thanku', 'thank u', 'appreciate'],
      responses: [
        "You're very welcome! 😊 I'm always here to help. If you have any more questions about Little Panda Preschool, just ask!",
        "My pleasure! Happy to help you learn more about our school. Feel free to ask about anything else!",
        "You're welcome! I'm here whenever you need information about our programs, facilities, or anything else."
      ]
    },
    
    goodbye: {
      patterns: ['bye', 'goodbye', 'see you', 'later', 'gtg', 'good night'],
      responses: [
        "Goodbye! Hope to welcome you and your little one to Little Panda Preschool soon! 🐼✨",
        "See you later! Don't hesitate to come back if you have more questions. Have a wonderful day!",
        "Bye! Thank you for your interest in Little Panda Preschool. Feel free to contact us anytime!"
      ]
    },
    
    help: {
      patterns: ['help', 'support', 'assist', 'guide', 'what can you do'],
      responses: [
        "I'd be delighted to help! I can provide comprehensive information about:\n• Complete fee structure and flexible payment options\n• Detailed admission process and requirements\n• School timings and daily activity schedules\n• Our curriculum and teaching methodologies\n• Transport services and safety measures\n• Teacher qualifications and student ratios\n• Meal facilities and nutrition policies\n• Special needs support and inclusive education\n• Events, activities, and parent involvement\n• Contact information and campus visits\n\nWhat specific area interests you most?"
      ]
    },
    
    positive: {
      patterns: ['okay', 'ok', 'fine', 'good', 'great', 'nice', 'awesome', 'perfect', 'cool', 'alright'],
      responses: [
        "Wonderful! Is there anything else you'd like to explore about Little Panda Preschool?",
        "Great! I'm here if you need more details about our programs, facilities, or any other aspects of our school.",
        "Perfect! Feel free to ask about anything else - admissions, curriculum, activities, or whatever interests you!"
      ]
    }
  };

  
  
  // Only trigger for short conversational inputs
 var inputWords = cleanInput.split(' ').filter(word => word.length > 0);
  
  // Don't trigger conversational responses for longer queries or educational questions
  if (inputWords.length > 2) {
    return null;
  }
  
  // Check for educational keywords that should bypass conversational responses
  var educationalKeywords = [
    'teaching', 'methodology', 'method', 'approach', 'curriculum', 'learning', 
    'education', 'instruction', 'pedagogy', 'assessment', 'evaluation',
    'special', 'needs', 'autism', 'adhd', 'disability', 'equipped', 'cater',
    'fees', 'cost', 'timing', 'schedule', 'transport', 'facilities'
  ];
  
  var hasEducationalKeyword = educationalKeywords.some(keyword => cleanInput.includes(keyword));
  if (hasEducationalKeyword) {
    return null; // Let it go to database search
  }
  
  // Only process if it's a short, simple conversational input
  for (var category in conversationalPatterns) {
    var patternData = conversationalPatterns[category];
    
    for (var i = 0; i < patternData.patterns.length; i++) {
      var pattern = patternData.patterns[i];
      
      // More strict matching - must be exact or very close match
      if (cleanInput === pattern || 
          (cleanInput.length <= 4 && cleanInput.includes(pattern)) ||
          (pattern.length <= 4 && pattern.includes(cleanInput))) {
        var randomIndex = Math.floor(Math.random() * patternData.responses.length);
        return patternData.responses[randomIndex];
      }
    }
  }
  
  return null;
}

// Keep existing helper functions
function calculateSimilarity(str1, str2) {
  if (str1.length === 0 || str2.length === 0) return 0;
  
  var longer = str1.length > str2.length ? str1 : str2;
  var shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  var editDistance = calculateEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function calculateEditDistance(str1, str2) {
  var matrix = [];
  
  for (var i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (var j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (var i = 1; i <= str2.length; i++) {
    for (var j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function recordFeedback(rowIndex, feedback, originalQuestion) {
  try {
    var spreadsheet = SpreadsheetApp.openById('1tzytt4G2U6dYG42qM01y4WucFhlJeNwRDLXHjFugMeQ');
    var mainSheet = spreadsheet.getActiveSheet();
    
    if (mainSheet.getRange('C1').getValue() === '') {
      mainSheet.getRange('C1').setValue('Success Count');
      mainSheet.getRange('D1').setValue('Failure Count');
      mainSheet.getRange('E1').setValue('Last Updated');
    }
    
    if (rowIndex > 0) {
      var currentSuccessCount = mainSheet.getRange('C' + rowIndex).getValue() || 0;
      var currentFailureCount = mainSheet.getRange('D' + rowIndex).getValue() || 0;
      
      if (feedback === 'success') {
        mainSheet.getRange('C' + rowIndex).setValue(currentSuccessCount + 1);
      } else if (feedback === 'failure') {
        mainSheet.getRange('D' + rowIndex).setValue(currentFailureCount + 1);
      }
      
      mainSheet.getRange('E' + rowIndex).setValue(new Date());
    }
    
    logToAnalyticsSheet(spreadsheet, originalQuestion, feedback, rowIndex);
    
  } catch (error) {
    console.error('Error recording feedback:', error);
  }
}

function logQuestionAnswer(question, answer, rowIndex) {
  try {
    var spreadsheet = SpreadsheetApp.openById('1tzytt4G2U6dYG42qM01y4WucFhlJeNwRDLXHjFugMeQ');
    var analyticsSheet = getOrCreateAnalyticsSheet(spreadsheet);
    
    var answerText = typeof answer === 'string' ? answer : answer.answer || answer;
    
    analyticsSheet.appendRow([
      new Date(),
      question,
      answerText.substring(0, 100) + (answerText.length > 100 ? '...' : ''),
      rowIndex,
      '',
      ''
    ]);
    
  } catch (error) {
    console.error('Error logging question:', error);
  }
}

function logToAnalyticsSheet(spreadsheet, question, feedback, rowIndex) {
  try {
    var analyticsSheet = getOrCreateAnalyticsSheet(spreadsheet);
    var data = analyticsSheet.getDataRange().getValues();
    
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][1] === question && data[i][4] === '') {
        analyticsSheet.getRange('E' + (i + 1)).setValue(feedback);
        break;
      }
    }
    
  } catch (error) {
    console.error('Error updating analytics:', error);
  }
}

function getOrCreateAnalyticsSheet(spreadsheet) {
  var analyticsSheet = spreadsheet.getSheetByName('Analytics');
  
  if (!analyticsSheet) {
    analyticsSheet = spreadsheet.insertSheet('Analytics');
    
   analyticsSheet.getRange('A1:F1').setValues([[
      'Timestamp', 'Question', 'Answer', 'Row Index', 'Feedback', 'Notes'
    ]]);
    
    analyticsSheet.getRange('A1:F1').setFontWeight('bold');
    analyticsSheet.getRange('A1:F1').setBackground('#f0f0f0');
    
    analyticsSheet.setColumnWidth(1, 150);
    analyticsSheet.setColumnWidth(2, 300);
    analyticsSheet.setColumnWidth(3, 300);
    analyticsSheet.setColumnWidth(4, 100);
    analyticsSheet.setColumnWidth(5, 100);
    analyticsSheet.setColumnWidth(6, 200);
  }
  
  return analyticsSheet;
}

function isCommonSpellingVariation(userWord, keyword) {
  var variations = {
    'curiculum': 'curriculum',
    'curriculam': 'curriculum',
    'curriclum': 'curriculum',
    'ciriculum': 'curriculum',
    'curicculum': 'curriculum',
    'fess': 'fees',
    'feess': 'fees',
    'phees': 'fees',
    'trasport': 'transport',
    'transporte': 'transport',
    'transprot': 'transport',
    'timming': 'timing',
    'timeing': 'timing',
    'timmings': 'timings',
    'assesment': 'assessment',
    'assesments': 'assessment',
    'asessment': 'assessment',
    'comunication': 'communication',
    'comunciation': 'communication',
    'communicaton': 'communication',
    'admision': 'admission',
    'admissions': 'admission',
    'admissoin': 'admission',
    'payement': 'payment',
    'pymnt': 'payment',
    'payemnt': 'payment',
    'shedule': 'schedule',
    'schedual': 'schedule',
    'scedule': 'schedule',
    'facilty': 'facility',
    'facilites': 'facilities',
    'faciltiy': 'facility',
    'emergancy': 'emergency',
    'emrgency': 'emergency',
    'emergencies': 'emergency',
    'enrol': 'enroll',
    'enrollment': 'enroll',
    'enrollement': 'enroll',
    'techers': 'teachers',
    'teacher': 'teachers',
    'teechers': 'teachers',
    'speical': 'special',
    'specail': 'special',
    'spesial': 'special'
  };
  
  if (variations[userWord] && variations[userWord] === keyword) {
    return true;
  }
  
  for (var mistake in variations) {
    if (variations[mistake] === userWord && mistake === keyword) {
      return true;
    }
  }
  
  return false;
}

function calculateSimilarity(str1, str2) {
  if (str1.length === 0 || str2.length === 0) return 0;
  
  var longer = str1.length > str2.length ? str1 : str2;
  var shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  var editDistance = calculateEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function calculateEditDistance(str1, str2) {
  var matrix = [];
  
  for (var i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (var j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (var i = 1; i <= str2.length; i++) {
    for (var j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}