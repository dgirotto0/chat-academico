const pdf = require('pdf-parse');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');

class FileProcessingService {
  // Lista de tipos de arquivo suportados
  static SUPPORTED_FILE_TYPES = {
    // Documentos
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'application/vnd.oasis.opendocument.text': ['.odt'],
    
    // Planilhas
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
    'text/csv': ['.csv'],
    
    // Apresentações
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.oasis.opendocument.presentation': ['.odp'],
    
    // Imagens
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/tiff': ['.tif', '.tiff'],
    
    // Texto e código
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/json': ['.json'],
    'application/xml': ['.xml'],
    'text/xml': ['.xml'],
    'application/x-yaml': ['.yaml', '.yml'],
    'text/yaml': ['.yaml', '.yml'],
    'application/x-tex': ['.tex'],
    'text/x-python': ['.py'],
    'application/x-python-code': ['.py'],
    'text/x-r-source': ['.r'],
    'text/x-matlab': ['.m'],
    'application/x-matlab-data': ['.mat'],
    
    // Bibliografia
    'application/x-bibtex': ['.bib'],
    'text/x-bibtex': ['.bib'],
    'application/x-research-info-systems': ['.ris'],
    
    // Notebooks e arquivos especiais
    'application/x-ipynb+json': ['.ipynb'],
    'application/zip': ['.zip']
  };

  // Tipos de arquivo explicitamente bloqueados
  static BLOCKED_FILE_TYPES = {
    // Áudio
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/x-flac': ['.flac'],
    'audio/aac': ['.aac'],
    'audio/x-m4a': ['.m4a'],
    'audio/ogg': ['.ogg'],
    
    // Vídeo
    'video/mp4': ['.mp4'],
    'video/x-msvideo': ['.avi'],
    'video/x-matroska': ['.mkv'],
    'video/quicktime': ['.mov'],
    'video/x-ms-wmv': ['.wmv'],
    'video/x-flv': ['.flv'],
    'video/webm': ['.webm'],
    
    // Executáveis
    'application/x-msdownload': ['.exe'],
    'application/x-msi': ['.msi'],
    'application/x-apple-diskimage': ['.dmg'],
    'application/x-debian-package': ['.deb'],
    'application/x-redhat-package-manager': ['.rpm'],
    
    // Outros formatos não suportados
    'image/vnd.adobe.photoshop': ['.psd'],
    'application/postscript': ['.ai'],
    'application/octet-stream': ['.sketch', '.fig']
  };

  static validateFileType(originalName, mimeType) {
    const fileExtension = '.' + originalName.toLowerCase().split('.').pop();
    
    console.log(`=== VALIDANDO TIPO DE ARQUIVO ===`);
    console.log(`Arquivo: ${originalName}`);
    console.log(`MIME Type: ${mimeType}`);
    console.log(`Extensão: ${fileExtension}`);
    
    // Verificar se está explicitamente bloqueado
    for (const [blockedMime, blockedExts] of Object.entries(this.BLOCKED_FILE_TYPES)) {
      if (mimeType === blockedMime || blockedExts.includes(fileExtension)) {
        const category = this.getFileCategory(fileExtension);
        throw new Error(`Arquivos de ${category} não são suportados pelo sistema. Tipos aceitos: PDF, Word, Excel, PowerPoint, imagens, texto e código fonte.`);
      }
    }
    
    // Verificar se está na lista de suportados
    let isSupported = false;
    
    // Verificar por MIME type
    if (this.SUPPORTED_FILE_TYPES[mimeType]) {
      isSupported = true;
    }
    
    // Verificar por extensão
    if (!isSupported) {
      for (const [supportedMime, supportedExts] of Object.entries(this.SUPPORTED_FILE_TYPES)) {
        if (supportedExts.includes(fileExtension)) {
          isSupported = true;
          break;
        }
      }
    }
    
    if (!isSupported) {
      const category = this.getFileCategory(fileExtension);
      throw new Error(`Tipo de arquivo não suportado: ${category}. Tipos aceitos: PDF, Word, Excel, PowerPoint, imagens (JPG, PNG, GIF), texto, código fonte e notebooks.`);
    }
    
    console.log('✓ Tipo de arquivo validado com sucesso');
    return true;
  }

  static getFileCategory(extension) {
    const categories = {
      // Áudio
      '.mp3': 'áudio (MP3)',
      '.wav': 'áudio (WAV)', 
      '.flac': 'áudio (FLAC)',
      '.aac': 'áudio (AAC)',
      '.m4a': 'áudio (M4A)',
      '.ogg': 'áudio (OGG)',
      
      // Vídeo
      '.mp4': 'vídeo (MP4)',
      '.avi': 'vídeo (AVI)',
      '.mkv': 'vídeo (MKV)',
      '.mov': 'vídeo (MOV)',
      '.wmv': 'vídeo (WMV)',
      '.flv': 'vídeo (FLV)',
      '.webm': 'vídeo (WebM)',
      
      // Executáveis
      '.exe': 'executável (Windows)',
      '.msi': 'instalador (Windows)',
      '.dmg': 'imagem de disco (Mac)',
      '.deb': 'pacote (Debian)',
      '.rpm': 'pacote (Red Hat)',
      
      // Outros
      '.psd': 'imagem (Photoshop)',
      '.ai': 'vetor (Illustrator)',
      '.sketch': 'design (Sketch)',
      '.fig': 'design (Figma)'
    };
    
    return categories[extension] || `arquivo ${extension}`;
  }

  static async processFile(filePath, originalName, mimeType) {
    try {
      console.log(`=== INICIANDO PROCESSAMENTO ===`);
      console.log(`Arquivo: ${originalName}`);
      console.log(`Tipo: ${mimeType}`);
      console.log(`Caminho: ${filePath}`);
      
      // PRIMEIRA VALIDAÇÃO: Verificar se o tipo é suportado
      this.validateFileType(originalName, mimeType);
      
      const buffer = await fs.readFile(filePath);
      console.log(`Arquivo lido, tamanho: ${buffer.length} bytes`);
      
      // Detectar por extensão também
      const fileExt = originalName.toLowerCase().split('.').pop();
      
      let content = '';
      let metadata = {
        originalName,
        mimeType,
        fileExtension: fileExt,
        size: buffer.length,
        processedAt: new Date()
      };

      // Processar por tipo
      if (this.isImageFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO IMAGEM ===');
        const imageResult = await this.processImageFile(filePath, originalName, mimeType);
        content = imageResult.content;
        metadata.isImage = true;
        metadata.needsVision = true;
      } else if (this.isPDFFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO PDF ===');
        content = await this.processPDF(buffer);
      } else if (this.isExcelFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO EXCEL ===');
        content = await this.processExcel(buffer);
      } else if (this.isCSVFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO CSV ===');
        content = await this.processCSV(buffer, originalName);
      } else if (this.isTextFile(mimeType, fileExt)) {
        console.log(`=== DETECTADO COMO ARQUIVO DE TEXTO (${fileExt.toUpperCase()}) ===`);
        content = await this.processTextFile(buffer, originalName, fileExt);
      } else if (this.isBibliographyFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO BIBLIOGRAFIA ===');
        content = await this.processBibliography(buffer, originalName, fileExt);
        metadata.isBibliography = true;
      } else if (this.isNotebookFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO JUPYTER NOTEBOOK ===');
        content = await this.processNotebook(buffer, originalName);
      } else if (this.isZipFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO ARQUIVO ZIP ===');
        content = await this.processZip(filePath, originalName);
      } else if (this.isPowerPointFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO POWERPOINT ===');
        content = await this.processPowerPoint(buffer, originalName);
      } else if (this.isWordFile(mimeType, fileExt)) {
        console.log('=== DETECTADO COMO WORD ===');
        content = await this.processWord(buffer, originalName);
      } else {
        console.log('=== TIPO NÃO SUPORTADO ===');
        throw new Error(`Tipo de arquivo não suportado: ${mimeType} (.${fileExt})`);
      }

      console.log(`=== PROCESSAMENTO CONCLUÍDO ===`);
      console.log(`Tamanho do conteúdo processado: ${content.length} chars`);
      console.log(`Preview: ${content.substring(0, 150)}`);

      return {
        success: true,
        content: content.trim(),
        metadata
      };
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      return {
        success: false,
        error: error.message,
        metadata: { originalName, mimeType }
      };
    }
  }

  // Detectores de tipo
  static isImageFile(mimeType, ext) {
    const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/tif'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tif', 'tiff'];
    return imageMimes.includes(mimeType) || imageExts.includes(ext);
  }

  static isPDFFile(mimeType, ext) {
    return mimeType === 'application/pdf' || ext === 'pdf';
  }

  static isExcelFile(mimeType, ext) {
    const excelMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/vnd.oasis.opendocument.spreadsheet'
    ];
    const excelExts = ['xlsx', 'xls', 'ods'];
    return excelMimes.includes(mimeType) || excelExts.includes(ext);
  }

  static isCSVFile(mimeType, ext) {
    return mimeType.includes('csv') || ext === 'csv';
  }

  static isTextFile(mimeType, ext) {
    const textMimes = [
      'text/plain', 'application/json', 'application/xml', 'text/xml',
      'text/markdown', 'application/x-yaml', 'text/yaml', 'text/x-yaml',
      'application/x-tex', 'text/x-tex', 'application/x-latex',
      'text/x-python', 'application/x-python-code', 'text/x-r-source',
      'text/x-matlab', 'application/x-matlab-data'
    ];
    const textExts = [
      'txt', 'json', 'xml', 'md', 'yaml', 'yml', 'tex',
      'py', 'r', 'm', 'mat'
    ];
    return textMimes.some(mime => mimeType.includes(mime)) || textExts.includes(ext);
  }

  static isBibliographyFile(mimeType, ext) {
    const bibMimes = ['application/x-bibtex', 'text/x-bibtex', 'application/x-research-info-systems'];
    const bibExts = ['bib', 'ris'];
    return bibMimes.includes(mimeType) || bibExts.includes(ext);
  }

  static isNotebookFile(mimeType, ext) {
    return mimeType === 'application/x-ipynb+json' || ext === 'ipynb';
  }

  static isZipFile(mimeType, ext) {
    return mimeType.includes('zip') || ext === 'zip';
  }

  static isPowerPointFile(mimeType, ext) {
    const pptMimes = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',
      'application/vnd.oasis.opendocument.presentation'
    ];
    const pptExts = ['pptx', 'ppt', 'odp'];
    return pptMimes.includes(mimeType) || pptExts.includes(ext);
  }

  static isWordFile(mimeType, ext) {
    const wordMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.oasis.opendocument.text'
    ];
    const wordExts = ['docx', 'doc', 'odt'];
    return wordMimes.includes(mimeType) || wordExts.includes(ext);
  }

  // Processadores específicos
  static async processImageFile(filePath, originalName, mimeType) {
    try {
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      // Verificar o tamanho da imagem
      const imageSizeKB = Buffer.byteLength(base64Image, 'base64') / 1024;
      
      // Se a imagem for muito grande (>2MB), redimensionar
      if (imageSizeKB > 2048) {
        console.log(`Imagem ${originalName} é muito grande (${imageSizeKB.toFixed(0)}KB), redimensionando...`);
        // Aqui você pode implementar redimensionamento se necessário
        // Por enquanto, vamos limitar o que armazenamos
      }

      return {
        success: true,
        content: JSON.stringify({
          type: 'image',
          originalName,
          mimeType,
          base64: base64Image.length > 1000000 ? base64Image.substring(0, 1000000) + '...' : base64Image // Limitar tamanho
        }),
        analysis: `Imagem ${originalName} processada e pronta para análise visual.`
      };
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      return {
        success: false,
        content: `Erro ao processar a imagem: ${error.message}`,
        analysis: null
      };
    }
  }

  static async processPDF(buffer) {
    try {
      const data = await pdf(buffer, {
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
      return data.text;
    } catch (error) {
      throw new Error(`Erro ao processar PDF: ${error.message}`);
    }
  }

  static async processExcel(buffer) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let content = '';
      
      workbook.SheetNames.forEach((sheetName, index) => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        if (index > 0) content += '\n\n';
        content += `=== PLANILHA: ${sheetName} ===\n`;
        
        jsonData.forEach((row, rowIndex) => {
          if (row.length > 0 && row.some(cell => cell !== '')) {
            content += `Linha ${rowIndex + 1}: ${row.join(' | ')}\n`;
          }
        });
      });
      
      return content;
    } catch (error) {
      throw new Error(`Erro ao processar planilha: ${error.message}`);
    }
  }

  static async processCSV(buffer, originalName) {
    try {
      const csvText = buffer.toString('utf8');
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) return `Arquivo CSV vazio: ${originalName}`;
      
      const header = lines[0];
      const columns = header.split(',').map(col => col.trim().replace(/['"]/g, ''));
      
      let content = `=== ARQUIVO CSV: ${originalName} ===\n`;
      content += `Colunas: ${columns.join(' | ')}\n`;
      content += `Total de registros: ${lines.length - 1}\n\n`;
      
      // Primeiras 10 linhas
      const sampleLines = lines.slice(1, Math.min(11, lines.length));
      content += `=== PRIMEIROS REGISTROS ===\n`;
      
      sampleLines.forEach((line, index) => {
        const values = line.split(',').map(val => val.trim().replace(/['"]/g, ''));
        content += `Linha ${index + 1}:\n`;
        columns.forEach((col, colIndex) => {
          content += `  ${col}: ${values[colIndex] || ''}\n`;
        });
        content += '\n';
      });
      
      if (lines.length > 11) {
        content += `... e mais ${lines.length - 11} registros\n`;
      }
      
      return content;
    } catch (error) {
      throw new Error(`Erro ao processar CSV: ${error.message}`);
    }
  }

  static async processTextFile(buffer, originalName, ext) {
    try {
      let content = buffer.toString('utf8');
      
      let header = `=== ARQUIVO ${ext.toUpperCase()}: ${originalName} ===\n`;
      
      switch (ext) {
        case 'py':
          header += `=== CÓDIGO PYTHON ===\n`;
          break;
        case 'r':
          header += `=== CÓDIGO R ===\n`;
          break;
        case 'm':
          header += `=== CÓDIGO MATLAB ===\n`;
          break;
        case 'tex':
          header += `=== CÓDIGO LATEX ===\n`;
          break;
        case 'json':
          header += `=== DADOS JSON ===\n`;
          try {
            const parsed = JSON.parse(content);
            content = JSON.stringify(parsed, null, 2);
          } catch (e) {
            // Se não conseguir parsear, manter como texto
          }
          break;
        case 'xml':
          header += `=== DADOS XML ===\n`;
          break;
        case 'yaml':
        case 'yml':
          header += `=== DADOS YAML ===\n`;
          break;
        case 'md':
          header += `=== MARKDOWN ===\n`;
          break;
        default:
          header += `=== CONTEÚDO ===\n`;
      }
      
      return header + content;
    } catch (error) {
      throw new Error(`Erro ao processar arquivo de texto: ${error.message}`);
    }
  }

  static async processBibliography(buffer, originalName, ext) {
    try {
      const content = buffer.toString('utf8');
      let header = `=== BIBLIOGRAFIA ${ext.toUpperCase()}: ${originalName} ===\n`;
      
      if (ext === 'bib') {
        header += `=== REFERÊNCIAS BIBTEX ===\n`;
        // Contar entradas
        const entries = content.match(/@\w+\s*\{/g);
        if (entries) {
          header += `Total de referências: ${entries.length}\n\n`;
        }
      } else if (ext === 'ris') {
        header += `=== REFERÊNCIAS RIS ===\n`;
        // Contar entradas RIS
        const entries = content.match(/^TY\s*-/gm);
        if (entries) {
          header += `Total de referências: ${entries.length}\n\n`;
        }
      }
      
      return header + content;
    } catch (error) {
      throw new Error(`Erro ao processar bibliografia: ${error.message}`);
    }
  }

  static async processNotebook(buffer, originalName) {
    try {
      const content = buffer.toString('utf8');
      const notebook = JSON.parse(content);
      
      let result = `=== JUPYTER NOTEBOOK: ${originalName} ===\n`;
      result += `Linguagem: ${notebook.metadata?.kernelspec?.display_name || 'Não especificada'}\n`;
      result += `Total de células: ${notebook.cells?.length || 0}\n\n`;
      
      if (notebook.cells) {
        notebook.cells.forEach((cell, index) => {
          result += `=== CÉLULA ${index + 1} (${cell.cell_type}) ===\n`;
          
          if (cell.source && Array.isArray(cell.source)) {
            result += cell.source.join('') + '\n';
          } else if (cell.source) {
            result += cell.source + '\n';
          }
          
          if (cell.outputs && cell.outputs.length > 0) {
            result += `--- Saída ---\n`;
            cell.outputs.forEach(output => {
              if (output.text) {
                result += Array.isArray(output.text) ? output.text.join('') : output.text;
              }
            });
          }
          result += '\n';
        });
      }
      
      return result;
    } catch (error) {
      throw new Error(`Erro ao processar notebook: ${error.message}`);
    }
  }

  static async processZip(filePath, originalName) {
    try {
      const zip = new AdmZip(filePath);
      const entries = zip.getEntries();
      
      let content = `=== ARQUIVO ZIP: ${originalName} ===\n`;
      content += `Total de arquivos: ${entries.length}\n\n`;
      content += `=== CONTEÚDO DO ARQUIVO ===\n`;
      
      entries.forEach(entry => {
        content += `📁 ${entry.entryName} (${(entry.header.size / 1024).toFixed(1)} KB)\n`;
      });
      
      // Tentar extrair arquivos de texto pequenos
      const textFiles = entries.filter(entry => 
        !entry.isDirectory && 
        entry.header.size < 1024 * 100 && // Menor que 100KB
        /\.(txt|md|json|py|r|yaml|yml)$/i.test(entry.entryName)
      );
      
      if (textFiles.length > 0) {
        content += `\n=== CONTEÚDO DE ARQUIVOS DE TEXTO ===\n`;
        textFiles.slice(0, 5).forEach(entry => { // Máximo 5 arquivos
          try {
            const fileContent = entry.getData().toString('utf8');
            content += `\n--- ${entry.entryName} ---\n`;
            content += fileContent.substring(0, 1000); // Máximo 1000 chars por arquivo
            if (fileContent.length > 1000) content += '\n... (truncado)';
            content += '\n';
          } catch (e) {
            content += `\n--- ${entry.entryName} ---\n[Erro ao ler arquivo]\n`;
          }
        });
      }
      
      return content;
    } catch (error) {
      throw new Error(`Erro ao processar ZIP: ${error.message}`);
    }
  }

  static async processPowerPoint(buffer, originalName) {
    try {
      // Por enquanto, apenas indica que é um PowerPoint
      // Implementação completa requereria biblioteca específica
      return `=== APRESENTAÇÃO POWERPOINT: ${originalName} ===\n` +
             `Arquivo PowerPoint detectado. Para análise completa, converta para PDF.\n` +
             `Tamanho: ${(buffer.length / 1024).toFixed(1)} KB`;
    } catch (error) {
      throw new Error(`Erro ao processar PowerPoint: ${error.message}`);
    }
  }

  static async processWord(buffer, originalName) {
    try {
      // Por enquanto, apenas indica que é um Word
      // Implementação completa requereria biblioteca específica como mammoth
      return `=== DOCUMENTO WORD: ${originalName} ===\n` +
             `Arquivo Word detectado. Para análise completa, converta para PDF.\n` +
             `Tamanho: ${(buffer.length / 1024).toFixed(1)} KB`;
    } catch (error) {
      throw new Error(`Erro ao processar Word: ${error.message}`);
    }
  }

  static getFileIcon(mimeType, fileExt = '') {
    const ext = fileExt || (mimeType ? mimeType.split('/')[1] : '');
    
    const icons = {
      // Documentos
      'pdf': '📄',
      'docx': '📘', 'doc': '📘', 'odt': '📘',
      'pptx': '📊', 'ppt': '📊', 'odp': '📊',
      
      // Planilhas
      'xlsx': '📊', 'xls': '📊', 'ods': '📊',
      'csv': '📈',
      
      // Código
      'py': '🐍', 'ipynb': '📓',
      'r': '📊', 'm': '🔢', 'mat': '🔢',
      'json': '🔧', 'xml': '🔧', 'yaml': '🔧', 'yml': '🔧',
      
      // Texto
      'txt': '📝', 'md': '📝', 'tex': '📝',
      
      // Bibliografia
      'bib': '📚', 'ris': '📚',
      
      // Imagens
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 
      'gif': '🖼️', 'webp': '🖼️', 'tif': '🖼️', 'tiff': '🖼️',
      
      // Outros
      'zip': '📦'
    };
    
    return icons[ext] || icons[mimeType] || '📎';
  }
}

module.exports = FileProcessingService;
