'use client';

import { useState, useCallback, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { Upload, FileText, CheckCircle, AlertCircle, X, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

// 업로드 단계 타입
type UploadStep = 'upload' | 'preview' | 'mapping' | 'validation' | 'processing' | 'complete';

// 파일 데이터 타입
interface FileData {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  headers: string[];
  data: Record<string, any>[];
  totalRows: number;
}

// 칼럼 매핑 타입
interface ColumnMapping {
  [csvColumn: string]: string;
}

// 중복 검출 결과 타입
interface DuplicateResult {
  internalDuplicates: any[];
  dbDuplicates: any[];
  uniqueRecords: any[];
  uploadedCount?: number;
  errorCount?: number;
}

// DB 필드 목록 (실제 업무 구조 반영)
const DB_FIELDS = [
  { key: '', label: '매핑하지 않음', required: false },
  { key: 'phone', label: '📞 전화번호 (중복검사 기준)', required: true },
  { key: 'contact_name', label: '🎭 전문가 (상담원이 사용할 이름)', required: true },
  { key: 'data_source', label: '🏢 DB업체 (제공업체명)', required: false },
  { key: 'contact_script', label: '💬 관심내용 (접근 스크립트)', required: false },
  { key: 'data_date', label: '📅 일시 (데이터 생성일)', required: false },
  { key: 'extra_info', label: '📝 기타정보', required: false },
];

export default function LeadUploadPage() {
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 드롭 핸들러
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // 파일 업로드 핸들러 (실제 파일 파싱)
  const handleFileUpload = async (file: File) => {
    const fileType = file.name.endsWith('.xlsx') ? 'xlsx' : 'csv';
    
    try {
      let parsedData: FileData;
      
      if (fileType === 'xlsx') {
        // Excel 파일 파싱
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // 헤더와 데이터 추출
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        const headers = rawData[0] || [];
        const dataRows = rawData.slice(1);
        
        // JSON 형태로 변환
        const jsonData = dataRows.map(row => {
          const obj: Record<string, any> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
        
        parsedData = {
          fileName: file.name,
          fileType,
          headers,
          data: jsonData,
          totalRows: dataRows.length
        };
      } else {
        // CSV 파일 파싱
        const text = await file.text();
        const Papa = await import('papaparse');
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false
        });
        
        parsedData = {
          fileName: file.name,
          fileType,
          headers: result.meta.fields || [],
          data: result.data,
          totalRows: result.data.length
        };
      }
      
      setFileData(parsedData);
      setCurrentStep('preview');
      
    } catch (error) {
      console.error('파일 파싱 오류:', error);
      alert('파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
    }
  };

  // 파일 선택 버튼 클릭
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 칼럼 매핑 설정
  const handleColumnMapping = (csvColumn: string, dbField: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [csvColumn]: dbField
    }));
  };

  // 매핑 완료 및 검증 시작 (수정된 중복 처리 로직)
  const handleMappingComplete = async () => {
    if (!fileData) {
      alert('파일 데이터가 없습니다.');
      return;
    }

    // 매핑된 전화번호 필드 찾기
    const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone');
    if (!phoneField) {
      alert('전화번호 매핑이 필요합니다.');
      return;
    }

    try {
      // 실제 파일에서 전화번호 추출
      const phoneNumbers = fileData.data
        .map(row => row[phoneField])
        .filter(phone => phone && phone.toString().trim())
        .map(phone => phone.toString().trim());

      console.log('추출된 전화번호:', phoneNumbers.slice(0, 5)); // 디버깅용

      // 파일 내 중복 검사 (첫 번째 발생은 유지, 나머지만 중복으로 처리)
      const phoneFirstOccurrence: Record<string, number> = {};
      const internalDuplicates = [];
      
      fileData.data.forEach((row, index) => {
        const phone = row[phoneField]?.toString().trim();
        if (!phone) return;
        
        if (phoneFirstOccurrence[phone] === undefined) {
          // 첫 번째 발생 - 인덱스 저장
          phoneFirstOccurrence[phone] = index;
        } else {
          // 두 번째 이후 발생 - 중복으로 처리
          const duplicateData: any = { ...row };
          duplicateData.rowIndex = index + 2; // Excel 행 번호
          internalDuplicates.push(duplicateData);
        }
      });

      console.log('파일 내 중복 (첫 번째 제외):', internalDuplicates.length); // 디버깅용

      // 실제 DB 중복 검사 (Supabase 연결 문제 해결)
      let dbDuplicates = [];
      
      if (phoneNumbers.length > 0) {
        console.log('DB 중복 검사 시작...'); // 디버깅용
        
        try {
          // Supabase 연결 테스트
          const { data: testConnection } = await supabase
            .from('lead_pool')
            .select('count')
            .limit(1);
          
          console.log('DB 연결 테스트:', testConnection); // 디버깅용

          // 실제 중복 검사 (더 안전한 방식)
          const uniquePhones = [...new Set(phoneNumbers)];
          console.log('중복 검사할 유니크 번호들:', uniquePhones.length);

          const { data: existingLeads, error } = await supabase
            .from('lead_pool')
            .select('phone')
            .in('phone', uniquePhones);

          if (error) {
            console.error('Supabase 오류 상세:', error);
            console.error('오류 메시지:', error.message);
            console.error('오류 상세:', error.details);
            throw error;
          }

          console.log('DB 조회 결과:', existingLeads); // 디버깅용

          // DB 중복 데이터 찾기 (첫 번째 발생만 중복으로 표시)
          const existingPhones = new Set(existingLeads?.map(lead => lead.phone) || []);
          
          const seenInFile = new Set<string>();
          dbDuplicates = fileData.data.filter(row => {
            const phone = row[phoneField]?.toString().trim();
            if (!phone || !existingPhones.has(phone)) return false;
            
            // 파일 내에서 첫 번째 발생만 DB 중복으로 표시
            if (seenInFile.has(phone)) return false;
            seenInFile.add(phone);
            return true;
          }).map(row => ({
            ...row,
            reason: 'DB에 이미 존재하는 번호'
          }));

          console.log('DB 중복 발견:', dbDuplicates.length); // 디버깅용

        } catch (dbError) {
          console.warn('DB 중복 검사 실패, 계속 진행:', dbError);
          // RLS 문제일 가능성 - 임시로 비활성화 안내
          alert('DB 접근 권한 문제가 있습니다. RLS 정책을 확인해주세요.');
          dbDuplicates = [];
        }
      }

      // 최종 유니크 레코드 계산 (올바른 로직)
      const dbDuplicatePhones = new Set(dbDuplicates.map(d => d[phoneField]?.toString().trim()));
      const internalDuplicateIndexes = new Set(internalDuplicates.map(d => 
        fileData.data.findIndex(row => row === fileData.data[d.rowIndex - 2])
      ));

      const uniqueRecords = fileData.data.filter((row, index) => {
        const phone = row[phoneField]?.toString().trim();
        if (!phone) return false;
        
        // DB에 있는 번호는 제외
        if (dbDuplicatePhones.has(phone)) return false;
        
        // 파일 내 중복에서 첫 번째가 아닌 것들 제외
        if (internalDuplicateIndexes.has(index)) return false;
        
        return true;
      });

      console.log('최종 업로드 가능 레코드:', uniqueRecords.length); // 디버깅용
      console.log('계산 검증:', {
        총_데이터: fileData.data.length,
        파일내_중복_제외: internalDuplicates.length,
        DB_중복_제외: dbDuplicates.length,
        최종_업로드: uniqueRecords.length
      });

      const duplicateResult: DuplicateResult = {
        internalDuplicates,
        dbDuplicates,
        uniqueRecords
      };

      setDuplicateResult(duplicateResult);
      setCurrentStep('validation');

    } catch (error) {
      console.error('중복 검사 전체 오류:', error);
      
      // 오류가 발생해도 기본 로직으로 진행
      const seenPhones = new Set<string>();
      const uniqueRecords = fileData.data.filter(row => {
        const phone = row[phoneField]?.toString().trim();
        if (!phone || seenPhones.has(phone)) {
          return false;
        }
        seenPhones.add(phone);
        return true;
      });

      const fallbackResult: DuplicateResult = {
        internalDuplicates: [],
        dbDuplicates: [],
        uniqueRecords
      };

      setDuplicateResult(fallbackResult);
      setCurrentStep('validation');
      
      alert('중복 검사 중 오류가 발생했지만 기본 처리로 진행합니다.');
    }
  };

  // 최종 업로드 실행 (실제 Supabase 업로드)
  const handleFinalUpload = async () => {
    if (!fileData || !duplicateResult) {
      alert('업로드할 데이터가 없습니다.');
      return;
    }

    setCurrentStep('processing');
    setUploadProgress(0);

    try {
      // 1단계: 업로드 배치 생성
      const batchData = {
        file_name: fileData.fileName,
        file_type: fileData.fileType,
        total_rows: fileData.totalRows,
        column_mapping: columnMapping,
        upload_status: 'processing' as const
      };

      const { data: batch, error: batchError } = await supabase
        .from('upload_batches')
        .insert(batchData)
        .select()
        .single();

      if (batchError) {
        throw new Error(`배치 생성 실패: ${batchError.message}`);
      }

      setUploadProgress(20);

      // 2단계: 리드 데이터 변환
      const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone');
      const contactNameField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_name');
      const dataSourceField = Object.keys(columnMapping).find(key => columnMapping[key] === 'data_source');
      const contactScriptField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_script');
      const dataDateField = Object.keys(columnMapping).find(key => columnMapping[key] === 'data_date');
      const extraInfoField = Object.keys(columnMapping).find(key => columnMapping[key] === 'extra_info');

      if (!phoneField) {
        throw new Error('전화번호 필드가 매핑되지 않았습니다.');
      }

      const leadsToInsert = duplicateResult.uniqueRecords.map(row => {
        // 안전한 데이터 변환
        const phone = row[phoneField]?.toString().trim();
        const contactName = contactNameField ? row[contactNameField]?.toString().trim() : null;
        const dataSource = dataSourceField ? row[dataSourceField]?.toString().trim() : null;
        const contactScript = contactScriptField ? row[contactScriptField]?.toString().trim() : null;
        const extraInfo = extraInfoField ? row[extraInfoField]?.toString().trim() : null;
        
        // 데이터 검증 및 길이 제한
        return {
          upload_batch_id: batch.id,
          phone: phone && phone.length <= 20 ? phone : null,
          name: '미상', // 기본값
          contact_name: contactName && contactName.length <= 255 ? contactName : null,
          data_source: dataSource && dataSource.length <= 255 ? dataSource : null,
          contact_script: contactScript && contactScript.length <= 1000 ? contactScript : null,
          extra_info: extraInfo && extraInfo.length <= 1000 ? extraInfo : null,
          data_date: null, // 일단 null로 설정
          status: 'available' as const
        };
      }).filter(lead => lead.phone && lead.phone.match(/^010-[0-9]{4}-[0-9]{4}$/)); // 전화번호 형식 검증

      setUploadProgress(40);

      // 3단계: 리드 데이터 삽입 (배치로 처리)
      const batchSize = 100;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < leadsToInsert.length; i += batchSize) {
        const batchLeads = leadsToInsert.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('lead_pool')
          .insert(batchLeads);

        if (error) {
          console.error('리드 삽입 오류:', error);
          errorCount += batchLeads.length;
        } else {
          successCount += batchLeads.length;
        }

        // 진행률 업데이트
        const progress = 40 + ((i + batchLeads.length) / leadsToInsert.length) * 50;
        setUploadProgress(Math.min(progress, 90));
      }

      setUploadProgress(95);

      // 4단계: 배치 상태 업데이트
      const { error: updateError } = await supabase
        .from('upload_batches')
        .update({
          processed_rows: successCount,
          error_rows: errorCount,
          upload_status: errorCount > 0 ? 'completed_with_errors' : 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', batch.id);

      if (updateError) {
        console.error('배치 업데이트 오류:', updateError);
      }

      setUploadProgress(100);

      // 성공 메시지 표시
      setTimeout(() => {
        setCurrentStep('complete');
      }, 500);

      // 결과 통계 업데이트
      setDuplicateResult(prev => prev ? {
        ...prev,
        uploadedCount: successCount,
        errorCount: errorCount
      } : null);

    } catch (error) {
      console.error('업로드 오류:', error);
      alert(`업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      setCurrentStep('validation');
      setUploadProgress(0);
    }
  };

  // 단계별 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
            <div 
              className={designSystem.utils.cn(
                'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
                isDragOver 
                  ? 'border-accent bg-accent-light' 
                  : 'border-border-light hover:border-accent hover:bg-accent-light/50'
              )}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleFileSelect}
            >
              <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Upload className={designSystem.utils.cn('w-8 h-8', designSystem.colors.accent.text)} />
              </div>
              
              <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
                파일을 드래그하여 업로드하거나 클릭하세요
              </h3>
              
              <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-6')}>
                Excel (.xlsx) 또는 CSV (.csv) 파일을 지원합니다
              </p>
              
              <button className={designSystem.components.button.primary}>
                파일 선택
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-6">
            {/* 파일 정보 */}
            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-accent" />
                  <div>
                    <h3 className={designSystem.components.typography.h4}>{fileData?.fileName}</h3>
                    <p className={designSystem.components.typography.bodySm}>
                      {fileData?.totalRows}개 행 · {fileData?.headers.length}개 칼럼
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={designSystem.components.button.secondary}
                >
                  {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showPreview ? '미리보기 숨기기' : '데이터 미리보기'}
                </button>
              </div>

              {/* 데이터 미리보기 테이블 */}
              {showPreview && fileData && (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-light">
                      <tr>
                        {fileData.headers.map((header, index) => (
                          <th key={index} className="px-4 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fileData.data.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t">
                          {fileData.headers.map((header, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {fileData.data.length > 5 && (
                    <div className="px-4 py-2 bg-surface-light text-sm text-text-light">
                      ...그 외 {fileData.data.length - 5}개 행
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 다음 단계 버튼 */}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCurrentStep('upload')}
                className={designSystem.components.button.secondary}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                다시 업로드
              </button>
              <button 
                onClick={() => setCurrentStep('mapping')}
                className={designSystem.components.button.primary}
              >
                칼럼 매핑 설정
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'mapping':
        return (
          <div className="space-y-6">
            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-6')}>
                칼럼 매핑 설정
              </h3>
              
              <div className="space-y-4">
                {fileData?.headers.map((header) => (
                  <div key={header} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{header}</div>
                      <div className="text-sm text-text-light">
                        샘플: {fileData.data[0]?.[header] || '데이터 없음'}
                      </div>
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-text-light" />
                    
                    <div className="flex-1">
                      <select
                        value={columnMapping[header] || ''}
                        onChange={(e) => handleColumnMapping(header, e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      >
                        {DB_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label} {field.required && '(필수)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* 필수 필드 체크 */}
              <div className="mt-6 p-4 bg-surface-light rounded-lg">
                <h4 className="font-medium mb-3">매핑 상태</h4>
                <div className="space-y-2">
                  {DB_FIELDS.filter(f => f.required).map((field) => {
                    const isMapped = Object.values(columnMapping).includes(field.key);
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        {isMapped ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-warning" />
                        )}
                        <span className={isMapped ? 'text-success' : 'text-warning'}>
                          {field.label} {isMapped ? '매핑됨' : '매핑 필요'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 매핑 미리보기 */}
                <div className="mt-4 pt-4 border-t">
                  <h5 className="text-sm font-medium mb-2">매핑 미리보기</h5>
                  <div className="text-xs text-text-light space-y-1">
                    {Object.entries(columnMapping).map(([csvCol, dbField]) => {
                      if (!dbField) return null;
                      const fieldInfo = DB_FIELDS.find(f => f.key === dbField);
                      return (
                        <div key={csvCol} className="flex justify-between">
                          <span>📄 {csvCol}</span>
                          <span>→</span>
                          <span>🗃️ {fieldInfo?.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button 
                onClick={() => setCurrentStep('preview')}
                className={designSystem.components.button.secondary}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전 단계
              </button>
              <button 
                onClick={handleMappingComplete}
                disabled={!Object.values(columnMapping).includes('phone') || !Object.values(columnMapping).includes('contact_name')}
                className={designSystem.components.button.primary}
              >
                중복 검사 시작
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="space-y-6">
            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-6')}>
                중복 검사 결과
              </h3>

              {/* 통계 요약 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-success-light rounded-lg">
                  <div className="text-2xl font-bold text-success">{duplicateResult?.uniqueRecords.length || 0}</div>
                  <div className="text-sm text-success">업로드 가능</div>
                </div>
                <div className="p-4 bg-warning-light rounded-lg">
                  <div className="text-2xl font-bold text-warning">{duplicateResult?.internalDuplicates.length || 0}</div>
                  <div className="text-sm text-warning">파일 내 중복</div>
                </div>
                <div className="p-4 bg-error-light rounded-lg">
                  <div className="text-2xl font-bold text-error">{duplicateResult?.dbDuplicates.length || 0}</div>
                  <div className="text-sm text-error">DB 중복</div>
                </div>
              </div>

              {/* DB 중복 데이터 */}
              {duplicateResult && duplicateResult.dbDuplicates.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-error">DB 중복 데이터</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-error-light">
                        <tr>
                          <th className="px-4 py-2 text-left">전화번호</th>
                          <th className="px-4 py-2 text-left">사유</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateResult.dbDuplicates.map((item, index) => {
                          const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone') || 'phone';
                          return (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{item[phoneField] || Object.values(item)[0]}</td>
                              <td className="px-4 py-2 text-error">{item.reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 파일 내 중복 데이터 */}
              {duplicateResult && duplicateResult.internalDuplicates.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-warning">파일 내 중복 데이터</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-warning-light">
                        <tr>
                          <th className="px-4 py-2 text-left">전화번호</th>
                          <th className="px-4 py-2 text-left">행 번호</th>
                          <th className="px-4 py-2 text-left">기타 정보</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateResult.internalDuplicates.map((item, index) => {
                          const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone') || 'phone';
                          const contactField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_name');
                          return (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{item[phoneField]}</td>
                              <td className="px-4 py-2">{item.rowIndex}</td>
                              <td className="px-4 py-2">{contactField ? item[contactField] : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 중복이 없는 경우 */}
              {duplicateResult && duplicateResult.internalDuplicates.length === 0 && duplicateResult.dbDuplicates.length === 0 && (
                <div className="p-4 bg-success-light rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
                  <p className="text-success font-medium">중복된 데이터가 없습니다!</p>
                  <p className="text-success text-sm">모든 데이터를 안전하게 업로드할 수 있습니다.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button 
                onClick={() => setCurrentStep('mapping')}
                className={designSystem.components.button.secondary}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                매핑 수정
              </button>
              <button 
                onClick={handleFinalUpload}
                disabled={!duplicateResult?.uniqueRecords.length}
                className={designSystem.components.button.primary}
              >
                {duplicateResult?.uniqueRecords.length || 0}개 데이터 업로드
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Upload className={designSystem.utils.cn('w-8 h-8', designSystem.colors.accent.text)} />
              </div>
              
              <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
                데이터 업로드 중...
              </h3>
              
              <div className="w-full max-w-md mx-auto mb-4">
                <div className="w-full bg-surface-light rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-text-light mt-2">{uploadProgress}% 완료</p>
              </div>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-success-light rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              
              <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
                업로드 완료!
              </h3>
              
              <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-6')}>
                {duplicateResult?.uploadedCount || duplicateResult?.uniqueRecords.length || 0}개의 리드가 성공적으로 업로드되었습니다.
                {duplicateResult?.errorCount && duplicateResult.errorCount > 0 && (
                  <span className="text-error"> ({duplicateResult.errorCount}개 오류 발생)</span>
                )}
              </p>
              
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => {
                    setCurrentStep('upload');
                    setFileData(null);
                    setColumnMapping({});
                    setDuplicateResult(null);
                    setUploadProgress(0);
                  }}
                  className={designSystem.components.button.secondary}
                >
                  새 파일 업로드
                </button>
                <button className={designSystem.components.button.primary}>
                  리드 관리로 이동
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>데이터 업로드</h1>
        <p className={designSystem.components.typography.bodySm}>Excel, CSV 파일을 업로드하여 리드 데이터를 관리하세요</p>
      </div>

      {/* 진행 단계 표시 */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          {[
            { key: 'upload', label: '파일 업로드' },
            { key: 'preview', label: '데이터 확인' },
            { key: 'mapping', label: '칼럼 매핑' },
            { key: 'validation', label: '중복 검사' },
            { key: 'complete', label: '완료' }
          ].map((step, index) => {
            const isActive = currentStep === step.key;
            const isCompleted = ['upload', 'preview', 'mapping', 'validation'].indexOf(currentStep) > index;
            
            return (
              <div key={step.key} className="flex items-center">
                <div className={designSystem.utils.cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  isActive ? 'bg-accent text-white' :
                  isCompleted ? 'bg-success text-white' :
                  'bg-surface-light text-text-light'
                )}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className={designSystem.utils.cn(
                  'ml-2 text-sm',
                  isActive ? 'font-medium text-accent' :
                  isCompleted ? 'text-success' :
                  'text-text-light'
                )}>
                  {step.label}
                </span>
                {index < 4 && (
                  <ArrowRight className="w-4 h-4 mx-4 text-border" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 단계별 콘텐츠 */}
      {renderStepContent()}
    </AdminLayout>
  );
}