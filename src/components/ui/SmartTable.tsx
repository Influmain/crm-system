'use client';

import { useState, useEffect } from 'react';
import { tableSystem } from '@/lib/design-system/table';
import { designSystem } from '@/lib/design-system';
import { 
  Search, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  AlertTriangle,
  FileText
} from 'lucide-react';

// 디바운스 훅
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface SmartTableColumn<T> {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  width?: string;
  sortable?: boolean;
  render?: (value: any, record: T, searchQuery?: string) => React.ReactNode;
}

interface SmartTableProps<T> {
  // 📊 기본 데이터
  data: T[];
  columns: SmartTableColumn<T>[];
  getItemId: (item: T, index?: number) => string;
  
  // 🎯 선택 시스템 (선택적)
  selectedItems?: string[];
  onToggleSelection?: (id: string) => void;
  onSelectAll?: () => void;
  
  // 🔍 검색 설정 (선택적)
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchWidth?: string; // 검색창 너비 커스터마이징
  searchPosition?: 'left' | 'right' | 'center'; // 검색창 위치
  debounceMs?: number; // 디바운스 시간 커스터마이징
  
  // 📐 테이블 크기 설정 (선택적)
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  
  // 🎨 스타일 커스터마이징 (선택적)
  showSearchResult?: boolean; // 검색 결과 하단 표시 여부
  emptyMessage?: string;
  className?: string;
}

export default function SmartTable<T extends Record<string, any>>({
  data,
  columns,
  getItemId,
  selectedItems = [],
  onToggleSelection,
  onSelectAll,
  enableSearch = true,
  searchPlaceholder = "검색...",
  searchWidth = "w-80",
  searchPosition = "right",
  debounceMs = 300,
  height = "60vh",
  minHeight = "400px", 
  maxHeight = "800px",
  showSearchResult = true,
  emptyMessage = "데이터가 없습니다.",
  className = ""
}: SmartTableProps<T>) {
  // 검색 상태
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, debounceMs);

  // 정렬 상태
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // 정렬 핸들러
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronUp className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp className="w-3 h-3 text-accent" /> : 
      <ChevronDown className="w-3 h-3 text-accent" />;
  };

  // 텍스트 하이라이트
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(' + escapedQuery + ')', 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-accent-light text-accent font-medium rounded px-0.5">
          {part}
        </span>
      ) : part
    );
  };

  // 데이터 필터링 및 정렬
  const processedData = (() => {
    let filtered = [...data];

    // 검색 필터링
    if (debouncedSearch && enableSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(item => 
        columns.some(column => {
          const value = item[column.key];
          return value && value.toString().toLowerCase().includes(query);
        })
      );
    }

    // 정렬
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (sortConfig.direction === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filtered;
  })();

  // 검색 토글
  const toggleSearch = () => {
    if (isSearchOpen) {
      setSearchQuery('');
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
    }
  };

  // 검색창 위치 결정
  const getSearchPositionClass = () => {
    switch (searchPosition) {
      case 'left': return 'justify-start';
      case 'center': return 'justify-center';
      case 'right': 
      default: return 'justify-end';
    }
  };

  return (
    <div className={designSystem.utils.cn(className)}>
      {/* 테이블 컨테이너 */}
      <div className={tableSystem.container}>
        {/* 테이블 헤더 (검색 통합) */}
        <div className={tableSystem.header.container}>
          <table className="min-w-full">
            <thead>
              <tr className={tableSystem.header.row}>
                {columns.map((column, index) => {
                  const IconComponent = column.icon || FileText;
                  const isSortable = column.sortable !== false;
                  const isLastColumn = index === columns.length - 1;
                  
                  return (
                    <th 
                      key={column.key}
                      className={designSystem.utils.cn(
                        isSortable ? tableSystem.header.cellSortable : tableSystem.header.cell,
                        column.width || '',
                        isSortable && "group",
                        isLastColumn && "relative"
                      )}
                      onClick={isSortable ? () => handleSort(column.key) : undefined}
                    >
                      <div className={tableSystem.header.iconWrapper}>
                        <IconComponent className={tableSystem.header.icon} />
                        <span>{column.label}</span>
                        
                        {/* 정렬 아이콘 */}
                        {isSortable && renderSortIcon(column.key)}
                        
                        {/* 🔍 마지막 칼럼에 미니멀 검색 통합 */}
                        {isLastColumn && enableSearch && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            {!isSearchOpen ? (
                              /* 검색 아이콘 (헤더에 완전 통합) */
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSearch();
                                }}
                                className="p-1 rounded opacity-60 hover:opacity-100 hover:bg-bg-hover transition-all"
                                title="검색"
                              >
                                <Search className="w-3.5 h-3.5 text-text-tertiary" />
                              </button>
                            ) : (
                              /* 확장된 검색창 (헤더와 동일한 스타일) */
                              <div 
                                className="flex items-center space-x-1 bg-bg-primary border border-border-primary rounded px-2 py-1 min-w-56 shadow-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Search className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  placeholder={searchPlaceholder}
                                  className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-tertiary focus:outline-none min-w-0"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      toggleSearch();
                                    }
                                  }}
                                />
                                {searchQuery && (
                                  <button
                                    onClick={() => setSearchQuery('')}
                                    className="p-0.5 rounded hover:bg-bg-hover"
                                  >
                                    <X className="w-3 h-3 text-text-tertiary hover:text-accent" />
                                  </button>
                                )}
                                <button
                                  onClick={toggleSearch}
                                  className="p-0.5 rounded hover:bg-bg-hover"
                                >
                                  <X className="w-3 h-3 text-text-tertiary hover:text-accent" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
          </table>
        </div>

        {/* 스크롤 가능한 테이블 바디 */}
        <div 
          className={tableSystem.body.scrollContainer}
          style={{ 
            height,
            minHeight,
            maxHeight
          }}
        >
          {processedData.length > 0 ? (
            <table className="min-w-full">
              <tbody>
                {processedData.map((item) => {
                  const itemId = getItemId(item);
                  const isSelected = selectedItems.includes(itemId);
                  
                  return (
                    <tr 
                      key={itemId}
                      className={tableSystem.body.row.base}
                      onClick={() => onToggleSelection?.(itemId)}
                    >
                      {columns.map((column, columnIndex) => {
                        const value = item[column.key];
                        const displayValue = value?.toString() || '';
                        
                        return (
                          <td 
                            key={column.key}
                            className={designSystem.utils.cn(
                              tableSystem.body.cell,
                              column.width || '',
                              columnIndex === 0 && onToggleSelection && "relative"
                            )}
                          >
                            {/* 첫 번째 칼럼에 노션식 선택 시스템 */}
                            {columnIndex === 0 && onToggleSelection && (
                              <>
                                {/* 선택 표시 (파란 세로선) */}
                                <div className={`${tableSystem.selection.indicator} ${
                                  isSelected ? tableSystem.selection.indicatorVisible : tableSystem.selection.indicatorHidden
                                }`} />
                                
                                {/* 호버/선택 시 체크박스 */}
                                <div className={`${tableSystem.selection.checkbox.container} ${
                                  isSelected ? tableSystem.selection.checkbox.visible : tableSystem.selection.checkbox.hidden
                                }`}>
                                  <div className={`${tableSystem.selection.checkbox.box} ${
                                    isSelected ? tableSystem.selection.checkbox.selected : tableSystem.selection.checkbox.unselected
                                  }`}>
                                    {isSelected && (
                                      <Check className={tableSystem.selection.checkbox.checkIcon} />
                                    )}
                                  </div>
                                </div>

                                {/* 콘텐츠 (밀림 효과) */}
                                <div className={`${tableSystem.selection.content.base} ${
                                  isSelected ? tableSystem.selection.content.selected : tableSystem.selection.content.unselected
                                }`}>
                                  {column.render 
                                    ? column.render(value, item, debouncedSearch)
                                    : (
                                      <span className="text-sm font-medium text-text-primary truncate">
                                        {highlightText(displayValue, debouncedSearch)}
                                      </span>
                                    )
                                  }
                                </div>
                              </>
                            )}
                            
                            {/* 나머지 칼럼들 */}
                            {columnIndex > 0 && (
                              <div className="text-sm text-text-primary truncate">
                                {column.render 
                                  ? column.render(value, item, debouncedSearch)
                                  : highlightText(displayValue, debouncedSearch)
                                }
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                
                {/* 목록 끝 표시 */}
                <tr>
                  <td colSpan={columns.length} className="py-3 text-center border-t border-border-primary">
                    <div className="text-xs text-text-tertiary">
                      • 목록 끝 • ({processedData.length}개 표시됨)
                      {debouncedSearch && ` • "${debouncedSearch}" 검색 결과`}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                {debouncedSearch ? (
                  <>
                    <Search className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-text-secondary mb-2">
                      "{debouncedSearch}"에 대한 검색 결과가 없습니다.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-accent hover:text-accent/80 text-sm"
                    >
                      검색어 지우기
                    </button>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-text-secondary">{emptyMessage}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 검색 상태 표시 (선택적) */}
        {showSearchResult && debouncedSearch && processedData.length > 0 && (
          <div className="px-4 py-2 bg-accent-light border-t border-border-primary text-sm">
            <span className="text-accent">
              "{debouncedSearch}" 검색 결과: {processedData.length}개
            </span>
          </div>
        )}
      </div>
    </div>
  );
}