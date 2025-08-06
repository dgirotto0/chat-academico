const FileGenerationService = require('../services/fileGenerationService');
const path = require('path');
const fs = require('fs'); // Usar fs síncrono para existsSync

const generatedFilesDir = path.join(__dirname, '../uploads/generated');

// Garante que o diretório de arquivos gerados exista
if (!fs.existsSync(generatedFilesDir)) {
  fs.mkdirSync(generatedFilesDir, { recursive: true });
}

class FileController {
  // Gerar arquivo baseado na resposta da IA
  static async generateFile(req, res) {
    try {
      const { type, data, filename, content } = req.body;
      const userId = req.user.id;

      console.log('=== SOLICITAÇÃO DE GERAÇÃO DE ARQUIVO ===');
      console.log('Tipo:', type);
      console.log('Nome:', filename);
      console.log('Usuário:', userId);

      let result;

      switch (type.toLowerCase()) {
        case 'excel':
        case 'xlsx':
          result = await FileGenerationService.generateExcelFile(data || content, filename, userId);
          break;
          
        case 'csv':
          result = await FileGenerationService.generateCSVFile(data || content, filename);
          break;
          
        case 'txt':
        case 'text':
          result = await FileGenerationService.generateTextFile(content, filename, 'txt');
          break;
          
        case 'json':
          const jsonContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : content;
          result = await FileGenerationService.generateTextFile(jsonContent, filename, 'json');
          break;
          
        case 'md':
        case 'markdown':
          result = await FileGenerationService.generateTextFile(content, filename, 'md');
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: `Tipo de arquivo não suportado: ${type}`
          });
      }

      if (result.success) {
        res.json({
          success: true,
          message: 'Arquivo gerado com sucesso',
          file: {
            filename: result.filename,
            originalName: result.originalName,
            downloadUrl: result.downloadUrl,
            mimeType: result.mimeType
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Erro ao gerar arquivo',
          error: result.error
        });
      }

    } catch (error) {
      console.error('Erro na geração de arquivo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Download de arquivo gerado
  static async downloadGeneratedFile(req, res) {
    try {
      const { filename } = req.params;
      // Medida de segurança para evitar path traversal
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).send('Nome de arquivo inválido.');
      }

      const filePath = path.join(generatedFilesDir, filename);

      if (fs.existsSync(filePath)) {
        // O nome original do arquivo é extraído do nome único do arquivo
        // Ex: 1678886400000-relatorio.xlsx -> relatorio.xlsx
        const originalName = filename.split('-').slice(1).join('-') || filename;
        res.download(filePath, originalName);
      } else {
        res.status(404).send('Arquivo não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo gerado:', error);
      res.status(500).send('Erro interno do servidor.');
    }
  }

  // Listar arquivos gerados disponíveis
  static async listGeneratedFiles(req, res) {
    try {
      const generatedDir = path.join(__dirname, '../uploads/generated');
      
      if (!fs.existsSync(generatedDir)) {
        return res.json({ success: true, files: [] });
      }

      const files = await fs.promises.readdir(generatedDir);
      const fileList = await Promise.all(
        files.map(async (filename) => {
          const filePath = path.join(generatedDir, filename);
          const stats = await fs.promises.stat(filePath);
            
          return {
            filename,
            originalName: filename.replace(/^\d+-/, ''),
            size: stats.size,
            createdAt: stats.birthtime,
            downloadUrl: `/api/files/download/generated/${filename}`
          };
        })
      );

      res.json({
        success: true,
        files: fileList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      });

    } catch (error) {
      console.error('Erro ao listar arquivos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  // Deletar arquivo gerado
  static async deleteGeneratedFile(req, res) {
    try {
      const { filename } = req.params;
      if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).send('Nome de arquivo inválido.');
      }
      const filePath = path.join(generatedFilesDir, filename);

      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        res.status(200).send('Arquivo deletado com sucesso.');
      } else {
        res.status(404).send('Arquivo não encontrado.');
      }
    } catch (error) {
      console.error('Erro ao deletar arquivo gerado:', error);
      res.status(500).send('Erro interno do servidor.');
    }
  }
}

module.exports = FileController;
