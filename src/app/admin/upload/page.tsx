'use client';

import { useState, useCallback, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons, getColumnIcon } from '@/lib/design-system/icons';
import SmartTable from '@/components/ui/SmartTable';
import { Upload, FileText, CheckCircle, AlertCircle, X, Eye, EyeOff, ArrowRight, ArrowLeft, RefreshCw, Check, AlertTriangle } from 'lucide-react';
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
  { key: '', label: '매핑하지 않음', required: false, icon: X },
  { key: 'phone', label: '📞 전화번호 (중복검사 기준)', required: true, icon: businessIcons.phone },
  { key: 'contact_name', label: '🎭 전문가 (상담원이 사용할 이름)', required: true, icon: businessIcons.contact },
  { key: 'data_source', label: '🏢 DB업체 (제공업체명)', required: false, icon: businessIcons.company },
  { key: 'contact_script', label: '💬 관심내용 (접근 스크립트)', required: false, icon: businessIcons.script },
  { key: 'data_date', label: '📅 일시 (데이터 생성일)', required: false, icon: businessIcons.date },
  { key: 'extra_info', label: '📝 기타정보', required: false, icon: FileText },
];

export default function LeadUploadPage() {
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [duplicateResult, setDuplicateResult] = useState<DuplicateResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 중복 데이터 선택/해제
  const toggleDuplicateSelection = (index: string) => {
    setSelectedDuplicates(prev => 
      prev.includes(index) 
        ? prev.filter(id => id !== index)
        : [...prev, index]
    );
  };

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
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        const headers = rawData[0] || [];
        const dataRows = rawData.slice(1);
        
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
    console.log(`매핑 설정: "${csvColumn}" → "${dbField}"`);
    setColumnMapping(prev => {
      const newMapping = {
        ...prev,
        [csvColumn]: dbField
      };
      console.log('업데이트된 매핑:', newMapping);
      return newMapping;
    });
  };

  // 🎨 미리보기 테이블 칼럼 정의 (동적)
  const getPreviewColumns = () => {
    if (!fileData) return [];
    
    return fileData.headers.map(header => ({
      key: header,
      label: header,
      icon: getColumnIcon(header),
      width: 'min-w-32',
      render: (value: any) => (
        <span className="text-sm text-text-primary">
          {value || '-'}
        </span>
      )
    }));
  };

  // 🚫 DB 중복 테이블 칼럼
  const dbDuplicateColumns = [
    {
      key: 'phone',
      label: '전화번호',
      icon: businessIcons.phone,
      width: 'w-40',
      render: (value: any, record: any) => {
        const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone') || 'phone';
        return (
          <div className="flex items-center">
            <businessIcons.phone className="w-3 h-3 mr-2 text-text-tertiary flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">
              {record[phoneField]}
            </span>
          </div>
        );
      }
    },
    {
      key: 'contact_info',
      label: '연락정보',
      icon: businessIcons.contact,
      width: 'w-32',
      render: (value: any, record: any) => {
        const contactField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_name');
        return (
          <div className="text-sm text-text-secondary truncate">
            {contactField ? record[contactField] : '-'}
          </div>
        );
      }
    },
    {
      key: 'reason',
      label: '중복 사유',
      icon: AlertTriangle,
      width: 'flex-1',
      render: (value: any, record: any) => (
        <div className="text-sm text-error truncate">
          {record.reason || 'DB에 이미 존재하는 번호'}
        </div>
      )
    }
  ];

  // ⚠️ 파일 내 중복 테이블 칼럼
  const internalDuplicateColumns = [
    {
      key: 'phone',
      label: '전화번호',
      icon: businessIcons.phone,
      width: 'w-40',
      render: (value: any, record: any) => {
        const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone') || 'phone';
        return (
          <div className="flex items-center">
            <businessIcons.phone className="w-3 h-3 mr-2 text-text-tertiary flex-shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">
              {record[phoneField]}
            </span>
          </div>
        );
      }
    },
    {
      key: 'rowIndex',
      label: '행 번호',
      icon: FileText,
      width: 'w-24',
      render: (value: any, record: any) => (
        <div className="text-sm text-text-tertiary">
          {record.rowIndex}
        </div>
      )
    },
    {
      key: 'other_info',
      label: '기타 정보',
      icon: businessIcons.contact,
      width: 'flex-1',
      render: (value: any, record: any) => {
        const contactField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_name');
        return (
          <div className="text-sm text-text-secondary truncate">
            {contactField ? record[contactField] : '-'}
          </div>
        );
      }
    }
  ];

  // 매핑 완료 및 검증 시작
  const handleMappingComplete = async () => {
    if (!fileData) {
      alert('파일 데이터가 없습니다.');
      return;
    }

    console.log('=== 매핑 검증 시작 ===');
    console.log('전체 columnMapping:', columnMapping);
    console.log('파일 헤더:', fileData.headers);
    console.log('샘플 데이터:', fileData.data[0]);

    const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone');
    const contactNameField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_name');
    
    console.log('매핑된 전화번호 필드:', phoneField);
    console.log('매핑된 연락정보 필드:', contactNameField);
    
    if (!phoneField) {
      alert('전화번호 매핑이 필요합니다.');
      return;
    }

    if (!contactNameField) {
      alert('연락정보 매핑이 필요합니다.');
      return;
    }

    try {
      // 실제 데이터에서 전화번호 추출 테스트
      console.log('=== 전화번호 추출 테스트 ===');
      console.log('첫 번째 행의 전화번호 필드 값:', fileData.data[0]?.[phoneField]);
      console.log('두 번째 행의 전화번호 필드 값:', fileData.data[1]?.[phoneField]);
      
      const phoneNumbers = fileData.data
        .map((row, index) => {
          const phone = row[phoneField];
          console.log(`${index + 1}행: ${phoneField} = "${phone}" (타입: ${typeof phone})`);
          return phone;
        })
        .filter(phone => phone && phone.toString().trim())
        .map(phone => phone.toString().trim());

      console.log('추출된 전화번호 전체:', phoneNumbers);
      console.log('추출된 전화번호 개수:', phoneNumbers.length);

      // 파일 내 중복 검사
      const phoneFirstOccurrence: Record<string, number> = {};
      const internalDuplicates = [];
      
      fileData.data.forEach((row, index) => {
        const phone = row[phoneField]?.toString().trim();
        if (!phone) return;
        
        if (phoneFirstOccurrence[phone] === undefined) {
          phoneFirstOccurrence[phone] = index;
        } else {
          const duplicateData: any = { ...row };
          duplicateData.rowIndex = index + 2; // Excel 행 번호
          internalDuplicates.push(duplicateData);
        }
      });

      console.log('파일 내 중복 (첫 번째 제외):', internalDuplicates.length);

      // DB 중복 검사
      let dbDuplicates = [];
      
      if (phoneNumbers.length > 0) {
        console.log('DB 중복 검사 시작...');
        
        try {
          const uniquePhones = [...new Set(phoneNumbers)];
          console.log('중복 검사할 유니크 번호들:', uniquePhones.length);

          const { data: existingLeads, error } = await supabase
            .from('lead_pool')
            .select('phone')
            .in('phone', uniquePhones);

          if (error) {
            console.error('Supabase 오류:', error);
            throw error;
          }

          console.log('DB 조회 결과:', existingLeads);

          const existingPhones = new Set(existingLeads?.map(lead => lead.phone) || []);
          
          const seenInFile = new Set<string>();
          dbDuplicates = fileData.data.filter(row => {
            const phone = row[phoneField]?.toString().trim();
            if (!phone || !existingPhones.has(phone)) return false;
            
            if (seenInFile.has(phone)) return false;
            seenInFile.add(phone);
            return true;
          }).map(row => ({
            ...row,
            reason: 'DB에 이미 존재하는 번호'
          }));

          console.log('DB 중복 발견:', dbDuplicates.length);

        } catch (dbError) {
          console.warn('DB 중복 검사 실패, 계속 진행:', dbError);
          alert('DB 접근 권한 문제가 있습니다. RLS 정책을 확인해주세요.');
          dbDuplicates = [];
        }
      }

      // 최종 유니크 레코드 계산
      const dbDuplicatePhones = new Set(dbDuplicates.map(d => d[phoneField]?.toString().trim()));
      const internalDuplicateIndexes = new Set(internalDuplicates.map(d => 
        fileData.data.findIndex(row => row === fileData.data[d.rowIndex - 2])
      ));

      const uniqueRecords = fileData.data.filter((row, index) => {
        const phone = row[phoneField]?.toString().trim();
        if (!phone) return false;
        
        if (dbDuplicatePhones.has(phone)) return false;
        if (internalDuplicateIndexes.has(index)) return false;
        
        return true;
      });

      console.log('최종 업로드 가능 레코드:', uniqueRecords.length);

      const duplicateResult: DuplicateResult = {
        internalDuplicates,
        dbDuplicates,
        uniqueRecords
      };

      setDuplicateResult(duplicateResult);
      setCurrentStep('validation');

    } catch (error) {
      console.error('중복 검사 전체 오류:', error);
      
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

  // 최종 업로드 실행 (실제 Supabase 업로드 구현)
  const handleFinalUpload = async () => {
    if (!fileData || !duplicateResult) {
      alert('업로드할 데이터가 없습니다.');
      return;
    }

    if (!duplicateResult.uniqueRecords || duplicateResult.uniqueRecords.length === 0) {
      alert('업로드할 수 있는 유니크 레코드가 없습니다.');
      return;
    }

    setCurrentStep('processing');
    setUploadProgress(0);

    try {
      console.log('=== 실제 업로드 시작 ===');
      console.log('업로드할 레코드 수:', duplicateResult.uniqueRecords.length);
      console.log('칼럼 매핑:', columnMapping);

      // 1. 업로드 배치 생성
      console.log('1. 업로드 배치 생성 중...');
      const batchId = crypto.randomUUID();
      const { error: batchError } = await supabase
        .from('upload_batches')
        .insert({
          id: batchId,
          file_name: fileData.fileName,
          uploaded_by: null, // TODO: 실제 로그인 시스템 구현 후 현재 사용자 ID로 변경
          total_rows: duplicateResult.uniqueRecords.length,
          created_at: new Date().toISOString()
        });

      if (batchError) {
        console.error('배치 생성 실패:', batchError);
        throw new Error(`배치 생성 실패: ${batchError.message}`);
      }

      setUploadProgress(10);
      console.log('✅ 배치 생성 완료:', batchId);

      // 2. 데이터 변환 및 검증
      console.log('2. 데이터 변환 중...');
      const recordsToInsert = duplicateResult.uniqueRecords.map((record, index) => {
        try {
          // 필수 필드 매핑
          const phoneField = Object.keys(columnMapping).find(key => columnMapping[key] === 'phone');
          const contactNameField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_name');
          
          if (!phoneField || !contactNameField) {
            throw new Error(`필수 필드 매핑 누락: phone=${phoneField}, contact_name=${contactNameField}`);
          }

          const phone = record[phoneField]?.toString().trim();
          const contactName = record[contactNameField]?.toString().trim();

          if (!phone || !contactName) {
            throw new Error(`레코드 ${index + 1}: 필수 데이터 누락 - phone: "${phone}", contact_name: "${contactName}"`);
          }

          // 선택적 필드 매핑
          const dataSourceField = Object.keys(columnMapping).find(key => columnMapping[key] === 'data_source');
          const contactScriptField = Object.keys(columnMapping).find(key => columnMapping[key] === 'contact_script');
          const dataDateField = Object.keys(columnMapping).find(key => columnMapping[key] === 'data_date');
          const extraInfoField = Object.keys(columnMapping).find(key => columnMapping[key] === 'extra_info');

          const transformedRecord = {
            id: crypto.randomUUID(),
            phone: phone,
            contact_name: contactName,
            data_source: dataSourceField ? (record[dataSourceField]?.toString().trim() || null) : null,
            contact_script: contactScriptField ? (record[contactScriptField]?.toString().trim() || null) : null,
            data_date: dataDateField ? (record[dataDateField] ? new Date(record[dataDateField]).toISOString() : null) : null,
            extra_info: extraInfoField ? (record[extraInfoField]?.toString().trim() || null) : null,
            status: 'available',
            upload_batch_id: batchId,
            created_at: new Date().toISOString()
          };

          console.log(`레코드 ${index + 1} 변환 완료:`, {
            phone: transformedRecord.phone,
            contact_name: transformedRecord.contact_name,
            data_source: transformedRecord.data_source
          });

          return transformedRecord;

        } catch (recordError) {
          console.error(`레코드 ${index + 1} 변환 실패:`, recordError);
          throw new Error(`레코드 ${index + 1} 변환 실패: ${recordError.message}`);
        }
      });

      setUploadProgress(30);
      console.log('✅ 데이터 변환 완료. 변환된 레코드 수:', recordsToInsert.length);

      // 3. 배치 업로드 (청크 단위로 처리)
      const BATCH_SIZE = 100; // 한 번에 100개씩 업로드
      let uploadedCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      console.log('3. 배치 업로드 시작...');
      
      for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
        const chunk = recordsToInsert.slice(i, i + BATCH_SIZE);
        const chunkNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalChunks = Math.ceil(recordsToInsert.length / BATCH_SIZE);
        
        console.log(`청크 ${chunkNumber}/${totalChunks} 업로드 중... (${chunk.length}개 레코드)`);

        try {
          const { data: insertedData, error: insertError } = await supabase
            .from('lead_pool')
            .insert(chunk)
            .select('id');

          if (insertError) {
            console.error(`청크 ${chunkNumber} 업로드 실패:`, insertError);
            
            // 개별 레코드 업로드 시도
            for (const record of chunk) {
              try {
                const { error: singleError } = await supabase
                  .from('lead_pool')
                  .insert([record]);
                
                if (singleError) {
                  console.error(`개별 레코드 업로드 실패 (${record.phone}):`, singleError);
                  errors.push(`${record.phone}: ${singleError.message}`);
                  errorCount++;
                } else {
                  uploadedCount++;
                }
              } catch (singleRecordError) {
                console.error(`개별 레코드 처리 실패 (${record.phone}):`, singleRecordError);
                errors.push(`${record.phone}: ${singleRecordError.message}`);
                errorCount++;
              }
            }
          } else {
            uploadedCount += insertedData?.length || chunk.length;
            console.log(`✅ 청크 ${chunkNumber} 업로드 완료: ${insertedData?.length || chunk.length}개`);
          }

        } catch (chunkError) {
          console.error(`청크 ${chunkNumber} 처리 실패:`, chunkError);
          errorCount += chunk.length;
          errors.push(`청크 ${chunkNumber}: ${chunkError.message}`);
        }

        // 진행률 업데이트 (30% ~ 90%)
        const progress = 30 + Math.floor((i + chunk.length) / recordsToInsert.length * 60);
        setUploadProgress(progress);
        
        // UI 업데이트를 위한 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setUploadProgress(95);

      // 4. 결과 처리 및 배치 정보 업데이트
      console.log('4. 업로드 결과 처리 중...');
      
      // upload_batches 테이블 구조에 맞게 업데이트 (존재하는 칼럼만 사용)
      const { error: batchUpdateError } = await supabase
        .from('upload_batches')
        .update({
          total_rows: uploadedCount, // 실제 업로드된 개수로 업데이트
          created_at: new Date().toISOString() // 완료 시간으로 업데이트
        })
        .eq('id', batchId);

      if (batchUpdateError) {
        console.warn('배치 정보 업데이트 실패 (무시해도 됨):', batchUpdateError);
      } else {
        console.log('✅ 배치 정보 업데이트 완료');
      }

      setUploadProgress(100);

      // 5. 최종 결과 설정
      setDuplicateResult(prev => prev ? {
        ...prev,
        uploadedCount: uploadedCount,
        errorCount: errorCount
      } : null);

      console.log('=== 업로드 완료 ===');
      console.log(`성공: ${uploadedCount}개, 실패: ${errorCount}개`);
      
      if (errors.length > 0) {
        console.log('오류 목록:', errors.slice(0, 10)); // 처음 10개만 로그
      }

      // 결과에 따른 메시지 표시
      if (errorCount === 0) {
        setTimeout(() => {
          setCurrentStep('complete');
          alert(`🎉 업로드 완료!\n성공: ${uploadedCount}개 리드가 업로드되었습니다.`);
        }, 500);
      } else if (uploadedCount > 0) {
        setTimeout(() => {
          setCurrentStep('complete');
          alert(`⚠️ 부분 업로드 완료\n성공: ${uploadedCount}개\n실패: ${errorCount}개\n\n일부 레코드에서 오류가 발생했습니다.`);
        }, 500);
      } else {
        throw new Error('모든 레코드 업로드에 실패했습니다.');
      }

    } catch (error) {
      console.error('업로드 전체 실패:', error);
      
      setCurrentStep('validation');
      setUploadProgress(0);
      
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      alert(`❌ 업로드 실패\n\n${errorMessage}\n\n다시 시도해주세요.`);
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
                  : 'border-border-secondary hover:border-accent hover:bg-accent-light/50'
              )}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleFileSelect}
            >
              <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Upload className="w-8 h-8 text-accent" />
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
              </div>

              {/* 🚀 SmartTable로 미리보기 */}
              {fileData && (
                <SmartTable
                  data={fileData.data.slice(0, 10)} // 처음 10개만 미리보기
                  columns={getPreviewColumns()}
                  getItemId={(item, index) => typeof index === 'number' ? `preview-row-${index}` : `preview-fallback-${Math.random()}`}
                  enableSearch={false} // 미리보기에서는 검색 비활성화
                  height="300px"
                  emptyMessage="파일 데이터가 없습니다."
                  className="mt-4"
                />
              )}

              {fileData && fileData.data.length > 10 && (
                <div className="mt-4 p-3 bg-bg-secondary rounded-lg text-center">
                  <p className="text-sm text-text-secondary">
                    미리보기: 총 {fileData.data.length}개 행 중 10개만 표시됨
                  </p>
                </div>
              )}
            </div>

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
                  <div key={header} className="flex items-center gap-4 p-4 border border-border-primary rounded-lg bg-bg-primary">
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">{header}</div>
                      <div className="text-sm text-text-secondary">
                        샘플: {fileData.data[0]?.[header] || '데이터 없음'}
                      </div>
                      <div className="text-xs text-text-tertiary">
                        타입: {typeof fileData.data[0]?.[header]} | 값: "{fileData.data[0]?.[header]}"
                      </div>
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-text-tertiary" />
                    
                    <div className="flex-1">
                      <select
                        value={columnMapping[header] || ''}
                        onChange={(e) => handleColumnMapping(header, e.target.value)}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                      >
                        {DB_FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label} {field.required && '(필수)'}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-accent mt-1">
                        현재 선택: {columnMapping[header] ? DB_FIELDS.find(f => f.key === columnMapping[header])?.label : '선택 안됨'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 매핑 상태 체크 */}
              <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border-primary">
                <h4 className="font-medium mb-3 text-text-primary flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  매핑 상태
                </h4>
                
                {/* 전체 매핑 현황 표시 */}
                <div className="mb-4 p-3 bg-bg-primary rounded border">
                  <h5 className="text-sm font-medium mb-2 text-text-primary">현재 매핑 현황</h5>
                  <div className="space-y-1 text-xs">
                    {Object.entries(columnMapping).map(([csvCol, dbField]) => (
                      <div key={csvCol} className="flex justify-between">
                        <span className="text-text-secondary">📄 {csvCol}</span>
                        <span>→</span>
                        <span className="text-accent">🗃️ {DB_FIELDS.find(f => f.key === dbField)?.label || dbField}</span>
                      </div>
                    ))}
                    {Object.keys(columnMapping).length === 0 && (
                      <div className="text-text-tertiary">아직 매핑된 칼럼이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {DB_FIELDS.filter(f => f.required).map((field) => {
                    const isMapped = Object.values(columnMapping).includes(field.key);
                    const mappedColumn = Object.keys(columnMapping).find(key => columnMapping[key] === field.key);
                    
                    return (
                      <div key={field.key} className="flex items-center gap-2">
                        {isMapped ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-warning" />
                        )}
                        <span className={isMapped ? 'text-success' : 'text-warning'}>
                          {field.label} {isMapped ? `✓ (${mappedColumn})` : '매핑 필요'}
                        </span>
                      </div>
                    );
                  })}
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
                <div className="p-4 bg-success-light rounded-lg border border-success/20">
                  <div className="text-2xl font-bold text-success">{duplicateResult?.uniqueRecords.length || 0}</div>
                  <div className="text-sm text-success">업로드 가능</div>
                </div>
                <div className="p-4 bg-warning-light rounded-lg border border-warning/20">
                  <div className="text-2xl font-bold text-warning">{duplicateResult?.internalDuplicates.length || 0}</div>
                  <div className="text-sm text-warning">파일 내 중복</div>
                </div>
                <div className="p-4 bg-error-light rounded-lg border border-error/20">
                  <div className="text-2xl font-bold text-error">{duplicateResult?.dbDuplicates.length || 0}</div>
                  <div className="text-sm text-error">DB 중복</div>
                </div>
              </div>

              {/* 🚀 DB 중복 데이터 - SmartTable */}
              {duplicateResult && duplicateResult.dbDuplicates.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-error flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    DB 중복 데이터 ({duplicateResult.dbDuplicates.length}개)
                  </h4>
                  
                  <SmartTable
                    data={duplicateResult.dbDuplicates}
                    columns={dbDuplicateColumns}
                    selectedItems={selectedDuplicates.filter(id => id.startsWith('db-duplicate-'))}
                    onToggleSelection={(id) => toggleDuplicateSelection(id.replace('db-duplicate-', 'db-'))}
                    getItemId={(item, index) => typeof index === 'number' ? `db-duplicate-${index}` : `db-fallback-${Math.random()}`}
                    height="200px"
                    minHeight="150px"
                    maxHeight="300px"
                    searchPlaceholder="중복 데이터 검색..."
                    emptyMessage="DB 중복 데이터가 없습니다."
                  />
                </div>
              )}

              {/* 🚀 파일 내 중복 데이터 - SmartTable */}
              {duplicateResult && duplicateResult.internalDuplicates.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-warning flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    파일 내 중복 데이터 ({duplicateResult.internalDuplicates.length}개)
                  </h4>
                  
                  <SmartTable
                    data={duplicateResult.internalDuplicates}
                    columns={internalDuplicateColumns}
                    selectedItems={selectedDuplicates.filter(id => id.startsWith('internal-duplicate-'))}
                    onToggleSelection={(id) => toggleDuplicateSelection(id.replace('internal-duplicate-', 'internal-'))}
                    getItemId={(item, index) => typeof index === 'number' ? `internal-duplicate-${index}` : `internal-fallback-${Math.random()}`}
                    height="200px"
                    minHeight="150px"
                    maxHeight="300px"
                    searchPlaceholder="중복 데이터 검색..."
                    emptyMessage="파일 내 중복 데이터가 없습니다."
                  />
                </div>
              )}

              {/* 중복이 없는 경우 */}
              {duplicateResult && duplicateResult.internalDuplicates.length === 0 && duplicateResult.dbDuplicates.length === 0 && (
                <div className="p-4 bg-success-light rounded-lg text-center border border-success/20">
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
                <RefreshCw className="w-8 h-8 text-accent animate-spin" />
              </div>
              
              <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
                데이터 업로드 중...
              </h3>
              
              <div className="w-full max-w-md mx-auto mb-4">
                <div className="w-full bg-bg-secondary rounded-full h-2">
                  <div 
                    className="bg-accent h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-text-secondary mt-2">{uploadProgress}% 완료</p>
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
                    setSelectedDuplicates([]);
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
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {[
            { key: 'upload', label: '파일 업로드', icon: Upload },
            { key: 'preview', label: '데이터 확인', icon: Eye },
            { key: 'mapping', label: '칼럼 매핑', icon: ArrowRight },
            { key: 'validation', label: '중복 검사', icon: CheckCircle },
            { key: 'complete', label: '완료', icon: CheckCircle }
          ].map((step, index) => {
            const isActive = currentStep === step.key;
            const isCompleted = ['upload', 'preview', 'mapping', 'validation'].indexOf(currentStep) > index;
            
            return (
              <div key={step.key} className="flex items-center flex-shrink-0">
                <div className={designSystem.utils.cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  isActive ? 'bg-accent text-white' :
                  isCompleted ? 'bg-success text-white' :
                  'bg-bg-secondary text-text-tertiary border border-border-primary'
                )}>
                  {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className={designSystem.utils.cn(
                  'ml-2 text-sm whitespace-nowrap',
                  isActive ? 'font-medium text-accent' :
                  isCompleted ? 'text-success' :
                  'text-text-tertiary'
                )}>
                  {step.label}
                </span>
                {index < 4 && (
                  <ArrowRight className="w-4 h-4 mx-4 text-border-primary flex-shrink-0" />
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