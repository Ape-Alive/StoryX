const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

class TextProcessingService {
  /**
   * Clean and normalize text
   * @param {string} text - Raw input text
   * @returns {Object} - Cleaned text and metadata
   */
  async cleanText(text) {
    try {
      // Remove extra whitespace and normalize
      const cleaned = text
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[\r\n]+/g, '\n');

      // Detect language (simplified - in production use a proper library)
      const language = this.detectLanguage(cleaned);

      return {
        cleanedText: cleaned,
        language,
        length: cleaned.length,
        wordCount: cleaned.split(/\s+/).length,
      };
    } catch (error) {
      logger.error('Text cleaning error:', error);
      throw new AppError('Failed to clean text', 500);
    }
  }

  /**
   * Detect language (simplified implementation)
   * @param {string} text - Text to analyze
   * @returns {string} - Detected language code
   */
  detectLanguage(text) {
    // Simplified language detection
    // In production, use a proper library like franc or langdetect
    const chinesePattern = /[\u4e00-\u9fa5]/;
    const englishPattern = /[a-zA-Z]/;

    if (chinesePattern.test(text)) {
      return 'zh-CN';
    } else if (englishPattern.test(text)) {
      return 'en-US';
    }
    return 'unknown';
  }

  /**
   * Split text into scenes
   * @param {string} text - Input text
   * @returns {Array} - Array of scene objects
   */
  async splitScenes(text) {
    try {
      // Split by paragraph breaks or scene markers
      const scenes = text
        .split(/\n\s*\n/)
        .filter(scene => scene.trim().length > 0)
        .map((scene, index) => ({
          id: `scene-${index + 1}`,
          content: scene.trim(),
          sequence: index + 1,
        }));

      return scenes;
    } catch (error) {
      logger.error('Scene splitting error:', error);
      throw new AppError('Failed to split scenes', 500);
    }
  }

  /**
   * Identify characters in text
   * @param {string} text - Input text
   * @returns {Array} - Array of character objects
   */
  async identifyCharacters(text) {
    try {
      // Simplified character identification
      // In production, use NLP libraries for entity recognition
      const characters = [];
      const characterNames = new Set();

      // Extract potential character names (simplified pattern)
      const namePattern = /["""]([^"""]+)["""]|「([^」]+)」/g;
      let match;

      while ((match = namePattern.exec(text)) !== null) {
        const name = match[1] || match[2];
        if (name && name.length <= 20) {
          characterNames.add(name.trim());
        }
      }

      // Convert to character objects
      characterNames.forEach((name, index) => {
        characters.push({
          id: `char-${index + 1}`,
          name,
          mentions: (text.match(new RegExp(name, 'g')) || []).length,
        });
      });

      return characters;
    } catch (error) {
      logger.error('Character identification error:', error);
      throw new AppError('Failed to identify characters', 500);
    }
  }

  /**
   * Extract emotions and actions
   * @param {string} text - Input text
   * @returns {Object} - Emotions and actions data
   */
  async extractEmotionsAndActions(text) {
    try {
      // Simplified emotion/action extraction
      // In production, use NLP models for sentiment analysis
      const emotions = [];
      const actions = [];

      // Emotion keywords (simplified)
      const emotionKeywords = {
        happy: ['高兴', '开心', '快乐', '兴奋', 'joy', 'happy', 'excited'],
        sad: ['悲伤', '难过', '伤心', 'sad', 'unhappy', 'depressed'],
        angry: ['愤怒', '生气', 'angry', 'mad', 'furious'],
        surprised: ['惊讶', '吃惊', 'surprised', 'shocked'],
      };

      // Action keywords (simplified)
      const actionKeywords = ['说', '走', '跑', '看', '笑', '哭', 'said', 'walked', 'ran', 'looked', 'laughed', 'cried'];

      // Extract emotions
      Object.keys(emotionKeywords).forEach(emotion => {
        emotionKeywords[emotion].forEach(keyword => {
          if (text.includes(keyword)) {
            emotions.push(emotion);
          }
        });
      });

      // Extract actions
      actionKeywords.forEach(keyword => {
        if (text.includes(keyword)) {
          actions.push(keyword);
        }
      });

      return {
        emotions: [...new Set(emotions)],
        actions: [...new Set(actions)],
      };
    } catch (error) {
      logger.error('Emotion/action extraction error:', error);
      throw new AppError('Failed to extract emotions and actions', 500);
    }
  }

  /**
   * Process complete text pipeline
   * @param {string} text - Raw input text
   * @returns {Object} - Complete processed text data
   */
  async processText(text) {
    try {
      logger.info('Starting text processing pipeline');

      // Step 1: Clean text
      const cleaned = await this.cleanText(text);

      // Step 2: Split scenes
      const scenes = await this.splitScenes(cleaned.cleanedText);

      // Step 3: Identify characters
      const characters = await this.identifyCharacters(cleaned.cleanedText);

      // Step 4: Extract emotions and actions
      const emotionsAndActions = await this.extractEmotionsAndActions(cleaned.cleanedText);

      // Process each scene
      const processedScenes = await Promise.all(
        scenes.map(async (scene) => {
          const sceneCharacters = await this.identifyCharacters(scene.content);
          const sceneEmotions = await this.extractEmotionsAndActions(scene.content);

          return {
            ...scene,
            characters: sceneCharacters.map(c => c.name),
            emotions: sceneEmotions.emotions,
            events: sceneEmotions.actions,
          };
        })
      );

      const result = {
        language: cleaned.language,
        statistics: {
          length: cleaned.length,
          wordCount: cleaned.wordCount,
          sceneCount: scenes.length,
          characterCount: characters.length,
        },
        scenes: processedScenes,
        characters: characters.map(char => ({
          name: char.name,
          description: '',
          attributes: {},
        })),
      };

      logger.info('Text processing completed', { sceneCount: scenes.length, characterCount: characters.length });

      return result;
    } catch (error) {
      logger.error('Text processing pipeline error:', error);
      throw error;
    }
  }
}

module.exports = new TextProcessingService();

