import * as path from 'path';

import {
  generateExportStatement,
  generateInterfaceDefinition,
  generateTypeDefinition,
  generateTypeName,
  generateUntypedSvgConstant,
  generateVariableName
} from '../generators/code-snippet-generators';
import { getFilePathsFromRegex } from '../helpers/regex-helpers';
import { deleteFolder, extractSvgContent, writeFile } from '../helpers/file-helpers';
import { info, separatorEnd, separatorStart, success } from '../helpers/log-helper';
import { svgOptimizer } from '../helpers/svg-optimization';
import { MultiFileConvertionOptions } from '../options/convertion-options';

const typesDelimitor = ' | ';

export const convertToMultipleFiles = async (convertionOptions: MultiFileConvertionOptions): Promise<void> => {
  const {
    typeName,
    interfaceName,
    prefix,
    delimiter,
    outputDirectory,
    srcFiles,
    modelOutputPath,
    modelFileName,
    iconsFolderName
  } = convertionOptions;
  let indexFileContent = '';
  let types = generateTypeDefinition(typeName);

  try {
    const filePaths = await getFilePathsFromRegex(srcFiles);
    await deleteFolder(`${outputDirectory}/${iconsFolderName}`);
    info(`deleting output directory: ${outputDirectory}/${iconsFolderName}`);

    separatorStart('File optimization');
    for (let i = 0; i < filePaths.length; i++) {
      const fileNameWithEnding = path.basename(filePaths[i]);
      const [filenameWithoutEnding, extension] = fileNameWithEnding.split('.');

      if (extension === 'svg') {
        const rawSvg = await extractSvgContent(filePaths[i]);
        info(`optimize svg: ${fileNameWithEnding}`);
        const optimizedSvg = await svgOptimizer.optimize(rawSvg);
        const variableName = generateVariableName(prefix, filenameWithoutEnding);
        const typeName = generateTypeName(filenameWithoutEnding, delimiter);
        const svgConstant = generateUntypedSvgConstant(variableName, typeName, optimizedSvg.data);
        const generatedFileName = `${prefix}-${filenameWithoutEnding}.icon`;
        indexFileContent += generateExportStatement(generatedFileName, iconsFolderName);
        await writeFile(`${outputDirectory}/${iconsFolderName}`, generatedFileName, svgConstant);
        info(`write file svg: ${outputDirectory}/${iconsFolderName}/${generatedFileName}.ts`);

        types += i === filePaths.length - 1 ? `'${typeName}';` : `'${typeName}'${typesDelimitor}`;
      }
    }
    separatorEnd();
    await writeFile(outputDirectory, 'index', indexFileContent);
    info(`write index.ts`);

    if (modelOutputPath && modelFileName) {
      const modelFile = (types += generateInterfaceDefinition(interfaceName, typeName));
      await writeFile(modelOutputPath, modelFileName, modelFile);
      info(`model-file successfully generated under ${modelOutputPath}/${modelFileName}.model.ts`);
    }

    success('========================================================');
    success(`your files were successfully created under: ${outputDirectory}`);
    success(
      `don't forget to copy this folder to your dist in a post build script - enjoy your tree-shakable icon library 😎`
    );
    success('========================================================');
  } catch (error) {
    error('Something went wrong', error);
  }
};
