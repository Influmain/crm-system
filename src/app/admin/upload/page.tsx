'use client';

import { useState, useCallback, useRef } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { Upload, FileText, CheckCircle, AlertCircle, X, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

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
}

// DB 필드 목록
const DB_FIELDS = [
  { key: '', label: '매핑하지 않음', required: false },
  { key: 'name', label: '이름', required: true },
  { key: 'phone', label: '전화번호', required: true },
  { key: 'email', label: '이메일', required: false },
  { key: 'age', label: '나이', required: false },
  { key: 'gender', label: '성별', required: false },
  { key: 'address', label: '주소', required: false },
  { key: 'interest_product', label: '관심상품', required: false },
  { key: 'source', label: '출처', required: false },
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

  // 파일 업로드 핸들러
  const handleFileUpload = (file: File) => {
    const fileType = file.name.endsWith('.xlsx') ? 'xlsx' : 'csv';
    
    // TODO: 실제 파일 파싱 로직
    const mockData: FileData = {
      fileName: file.name,
      fileType,
      headers: ['이름', '연락처', '이메일', '나이', '성별', '관심분야', '주소'],
      data: [
        { '이름': '김철수', '연락처': '010-1234-5678', '이메일': 'kim@test.com', '나이': '35', '성별': '남성', '관심분야': '투자', '주소': '서울시 강남구' },
        { '연락처': '010-9876-5432', '이메일': 'park@test.com', '나이': '28', '성별': '여성', '관심분야': '보험', '주소': '서울시 서초구' },
        { '이름': '이민수', '연락처': '010-5555-1234', '이메일': 'lee@test.com', '나이': '42', '성별': '남성', '관심분야': '펀드', '주소': '경기도 성남시' },
        { '이름': '최영수', '연락처': '010-1111-2222', '이메일': 'choi@test.com', '나이': '31', '성별': '남성', '관심분야': '적금', '주소': '인천시 연수구' },
        { '이름': '정미라', '연락처': '010-3333-4444', '이메일': 'jung@test.com', '나이': '26', '성별': '여성', '관심분야': '보험', '주소': '부산시 해운대구' },
      ],
      totalRows: 5
    };

    setFileData(mockData);
    setCurrentStep('preview');
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

  // 매핑 완료 및 검증 시작
  const handleMappingComplete = () => {
    const mockDuplicates: DuplicateResult = {
      internalDuplicates: [
        { '이름': '김철수', '연락처': '010-1234-5678', rowIndex: 1 }
      ],
      dbDuplicates: [
        { '이름': '이민수', '연락처': '010-5555-1234', reason: 'DB에 이미 존재하는 번호' }
      ],
      uniqueRecords: fileData?.data.slice(0, 3) || []
    };

    setDuplicateResult(mockDuplicates);
    setCurrentStep('validation');
  };

  // 최종 업로드 실행
  const handleFinalUpload = () => {
    setCurrentStep('processing');
    
    // 진행률 시뮬레이션
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        setCurrentStep('complete');
      }
    }, 500);
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
                disabled={!Object.values(columnMapping).includes('name') || !Object.values(columnMapping).includes('phone')}
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
                  <div className="text-2xl font-bold text-success">{duplicateResult?.uniqueRecords.length}</div>
                  <div className="text-sm text-success">업로드 가능</div>
                </div>
                <div className="p-4 bg-warning-light rounded-lg">
                  <div className="text-2xl font-bold text-warning">{duplicateResult?.internalDuplicates.length}</div>
                  <div className="text-sm text-warning">파일 내 중복</div>
                </div>
                <div className="p-4 bg-error-light rounded-lg">
                  <div className="text-2xl font-bold text-error">{duplicateResult?.dbDuplicates.length}</div>
                  <div className="text-sm text-error">DB 중복</div>
                </div>
              </div>

              {/* 중복 데이터 상세 */}
              {duplicateResult && duplicateResult.dbDuplicates.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium mb-3 text-error">DB 중복 데이터</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-error-light">
                        <tr>
                          <th className="px-4 py-2 text-left">이름</th>
                          <th className="px-4 py-2 text-left">전화번호</th>
                          <th className="px-4 py-2 text-left">사유</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateResult.dbDuplicates.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{item['이름']}</td>
                            <td className="px-4 py-2">{item['연락처']}</td>
                            <td className="px-4 py-2 text-error">{item.reason}</td>
                          </tr>
                        ))}
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
                          <th className="px-4 py-2 text-left">이름</th>
                          <th className="px-4 py-2 text-left">전화번호</th>
                          <th className="px-4 py-2 text-left">행 번호</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duplicateResult.internalDuplicates.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{item['이름']}</td>
                            <td className="px-4 py-2">{item['연락처']}</td>
                            <td className="px-4 py-2">{item.rowIndex}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                {duplicateResult?.uniqueRecords.length}개 데이터 업로드
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
                {duplicateResult?.uniqueRecords.length}개의 리드가 성공적으로 업로드되었습니다.
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