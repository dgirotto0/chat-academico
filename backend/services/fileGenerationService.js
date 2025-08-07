const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const PDFDocument = require('pdfkit');

class FileGenerationService {

  static async generateFileFromAIResponse(aiContent, userId) {
    const fileRequest = this.detectFileGenerationRequest(aiContent);
    if (!fileRequest.detected) {
      return null;
    }

    const filename = this.extractSuggestedFilename(aiContent);
    let fileResult;

    try {
      switch (fileRequest.type) {
        case 'excel':
          fileResult = await this.generateExcelFile(aiContent, filename, userId);
          break;
        case 'csv':
          fileResult = await this.generateCSVFile(aiContent, filename);
          break;
        case 'chart':
          fileResult = await this.generateChartFile(aiContent, filename);
          break;
        case 'image':
          fileResult = await this.generateImageFile(aiContent, filename);
          break;
        case 'pdf':
          fileResult = await this.generatePDFFile(aiContent, filename);
          break;
        default: // txt, md, json, etc.
          fileResult = await this.generateTextFile(aiContent, filename, fileRequest.type);
          break;
      }

      if (fileResult && fileResult.success) {
        return {
          filename: fileResult.filename,
          originalName: fileResult.originalName,
          downloadUrl: fileResult.downloadUrl,
          mimeType: fileResult.mimeType
        };
      }
    } catch (error) {
      console.error(`Erro ao gerar arquivo do tipo ${fileRequest.type}:`, error);
    }
    
    return null;
  }

  static async generateExcelFile(aiContent, filename) {
    try {
      
      const tableData = this.extractMarkdownTable(aiContent);
      if (!tableData || tableData.length === 0) {
        return { success: false, error: 'Nenhuma tabela Markdown encontrada para gerar o Excel.' };
      }

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(tableData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

      const outputDir = path.join(__dirname, '../uploads/generated');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}.xlsx`;
      const filePath = path.join(outputDir, uniqueFilename);

      XLSX.writeFile(workbook, filePath);

      return {
        success: true,
        filename: uniqueFilename,
        originalName: `${filename}.xlsx`,
        filePath,
        downloadUrl: `/api/files/download/generated/${uniqueFilename}`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

    } catch (error) {
      console.error('Erro ao gerar arquivo Excel:', error);
      return { success: false, error: error.message };
    }
  }

  static async generateCSVFile(aiContent, filename) {
    try {
      
      const tableData = this.extractMarkdownTable(aiContent);
      if (!tableData || tableData.length === 0) {
        return { success: false, error: 'Nenhuma tabela Markdown encontrada para gerar o CSV.' };
      }

      const csvContent = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(tableData));

      const outputDir = path.join(__dirname, '../uploads/generated');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}.csv`;
      const filePath = path.join(outputDir, uniqueFilename);

      await fs.writeFile(filePath, csvContent, 'utf8');

      return {
        success: true,
        filename: uniqueFilename,
        originalName: `${filename}.csv`,
        filePath,
        downloadUrl: `/api/files/download/generated/${uniqueFilename}`,
        mimeType: 'text/csv'
      };

    } catch (error) {
      console.error('Erro ao gerar arquivo CSV:', error);
      return { success: false, error: error.message };
    }
  }

  static async generatePDFFile(aiContent, filename) {
    try {
      
      const cleanContent = this.extractCleanText(aiContent);
      
      const outputDir = path.join(__dirname, '../uploads/generated');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}.pdf`;
      const filePath = path.join(outputDir, uniqueFilename);

      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const writeStream = require('fs').createWriteStream(filePath);

      doc.pipe(writeStream);

      doc.fontSize(16).font('Helvetica-Bold').text(filename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(12).font('Helvetica').text(cleanContent, { align: 'justify', indent: 20, lineGap: 4 });

      doc.end();

      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return {
        success: true,
        filename: uniqueFilename,
        originalName: `${filename}.pdf`,
        filePath,
        downloadUrl: `/api/files/download/generated/${uniqueFilename}`,
        mimeType: 'application/pdf'
      };
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      return { success: false, error: error.message };
    }
  }

  static async generateChartFile(aiContent, filename) {
    try {
      
      const jsonString = this.extractJsonBlock(aiContent);
      if (!jsonString) {
        return { success: false, error: 'Nenhum JSON de gráfico encontrado na resposta.' };
      }

      const chartConfig = JSON.parse(jsonString);

      const width = 800;
      const height = 600;
      const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
        width, 
        height, 
        backgroundColour: 'white',
        chartCallback: (ChartJS) => {
          ChartJS.defaults.font.size = 14;
          ChartJS.defaults.color = '#333';
          ChartJS.defaults.plugins.title.font = { size: 18 };
        }
      });
      
      const imageBuffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);

      const outputDir = path.join(__dirname, '../uploads/generated');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}.png`;
      const filePath = path.join(outputDir, uniqueFilename);

      await fs.writeFile(filePath, imageBuffer);

      return {
        success: true,
        filename: uniqueFilename,
        originalName: `${filename}.png`,
        filePath,
        downloadUrl: `/api/files/download/generated/${uniqueFilename}`,
        mimeType: 'image/png'
      };
    } catch (error) {
      console.error('Erro ao gerar gráfico:', error);
      return { success: false, error: error.message };
    }
  }

  static async generateImageFile(aiContent, filename) {
    try {
      
      const prompt = this.extractPromptTag(aiContent);
      if (!prompt) {
        return { success: false, error: 'Nenhum prompt para DALL-E encontrado.' };
      }

      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url"
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const imageUrl = response.data.data[0].url;
      
      const imageResponse = await axios({ url: imageUrl, responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data, 'binary');

      const outputDir = path.join(__dirname, '../uploads/generated');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}.png`;
      const filePath = path.join(outputDir, uniqueFilename);

      await fs.writeFile(filePath, imageBuffer);

      return {
        success: true,
        filename: uniqueFilename,
        originalName: `${filename}.png`,
        filePath,
        downloadUrl: `/api/files/download/generated/${uniqueFilename}`,
        mimeType: 'image/png'
      };
    } catch (error) {
      console.error('Erro ao gerar imagem com DALL-E:', error.response ? error.response.data : error.message);
      return { success: false, error: 'Falha ao gerar imagem.' };
    }
  }

  static async generateTextFile(content, filename, extension = 'txt') {
    try {
      
      const cleanContent = this.extractCleanText(content);
      
      const outputDir = path.join(__dirname, '../uploads/generated');
      await fs.mkdir(outputDir, { recursive: true });

      const timestamp = Date.now();
      const uniqueFilename = `${timestamp}-${filename}.${extension}`;
      const filePath = path.join(outputDir, uniqueFilename);

      await fs.writeFile(filePath, cleanContent, 'utf8');

      const mimeTypes = {
        'txt': 'text/plain',
        'md': 'text/markdown',
        'json': 'application/json',
        'xml': 'application/xml',
        'py': 'text/x-python',
        'js': 'application/javascript'
      };

      return {
        success: true,
        filename: uniqueFilename,
        originalName: `${filename}.${extension}`,
        filePath,
        downloadUrl: `/api/files/download/generated/${uniqueFilename}`,
        mimeType: mimeTypes[extension] || 'text/plain'
      };

    } catch (error) {
      console.error('Erro ao gerar arquivo de texto:', error);
      return { success: false, error: error.message };
    }
  }

  // --- MÉTODOS DE EXTRAÇÃO ---

  static extractJsonBlock(content) {
    const match = content.match(/```json\s*([\s\S]+?)\s*```/);
    return match ? match[1] : null;
  }

  static extractPromptTag(content) {
    const match = content.match(/\[PROMPT:\s*([^\]]+)\]/i);
    return match ? match[1].trim() : null;
  }

  static extractMarkdownTable(content) {
    const tableRegex = /^\s*\|(.+)\|\s*\n\s*\|([\s\S]+?)\n\n/m;
    const tableMatch = content.match(/\|(.+)\|\n *\|( *[-:]+[-| :]*?)\|\n((?: *\|.*(?:\n|$))+)/);
    if (!tableMatch) return null;

    const headers = tableMatch[1].split('|').map(h => h.trim()).filter(Boolean);
    const rows = tableMatch[3].split('\n').filter(r => r.trim());

    const data = rows.map(row => {
      const values = row.split('|').map(v => v.trim()).filter(Boolean);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
    return data;
  }

  static extractCleanText(content) {
    return content
      .replace(/```[\s\S]*?```/g, '') // Remove blocos de código
      .replace(/\[PROMPT:[\s\S]*?\]/g, '') // Remove prompts DALL-E
      .replace(/^.*(Para gerar|Copie o texto|Aqui está|Segue o conteúdo)[\s\S]*$/gm, '') // Remove instruções
      .replace(/\n{3,}/g, '\n\n') // Normaliza quebras de linha
      .trim();
  }

  static detectFileGenerationRequest(content) {
    // Detecta pela presença de formatos específicos primeiro
    if (/```json\s*([\s\S]+?)\s*```/.test(content)) return { type: 'chart', detected: true };
    if (/\[PROMPT:\s*([^\]]+)\]/i.test(content)) return { type: 'image', detected: true };
    if (/\|(.+)\|\n *\|( *[-:]+[-| :]*?)\|\n((?: *\|.*(?:\n|$))+)/.test(content)) return { type: 'excel', detected: true }; // Prioriza Excel para tabelas

    // Detecção genérica se os formatos específicos não forem encontrados
    const lowerContent = content.toLowerCase();
    const patterns = {
      pdf: /\b(pdf|documento.*pdf)\b/i,
      excel: /\b(excel|xlsx|planilha)\b/i,
      csv: /\b(csv)\b/i,
    };
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerContent)) {
        return { type, detected: true };
      }
    }
    return { detected: false };
  }

  static extractSuggestedFilename(content) {
    const patterns = [
      /arquivo.*chamado\s+["`']([^"`']+)["`']/i,
      /nome\s+["`']([^"`']+)["`']/i,
      /salvar.*como\s+["`']([^"`']+)["`']/i,
      /["`']([^"`']+\.(?:xlsx|csv|txt|json|md|pdf|docx))["`']/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].replace(/\.(xlsx|csv|txt|json|md|pdf|docx)$/i, '');
      }
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    return `relatorio-${timestamp}`;
  }
}

module.exports = FileGenerationService;
