/**
 * 노션 스타일 테이블 시스템 (업데이트 버전)
 * 모든 테이블 컴포넌트에서 일관된 스타일을 사용하기 위한 디자인 시스템
 */
export const tableSystem = {
  // 🎨 기본 컨테이너
  container: "relative bg-bg-primary border border-border-primary rounded-lg overflow-hidden",
  
  // 📋 헤더 스타일 (고정)
  header: {
    container: "overflow-x-auto border-b border-border-primary",
    row: "bg-bg-secondary",
    cell: "text-left py-2 px-3 text-xs font-medium text-text-tertiary uppercase tracking-wider",
    cellSortable: "text-left py-2 px-3 text-xs font-medium text-text-tertiary uppercase tracking-wider cursor-pointer hover:bg-bg-hover transition-colors",
    iconWrapper: "flex items-center space-x-2",
    icon: "w-3 h-3 text-text-tertiary", // 노션 스타일: 작고 무채색
    sortIcon: "w-3 h-3 text-text-tertiary ml-1 transition-transform",
    sortIconActive: "w-3 h-3 text-accent ml-1 transition-transform",
    
    // 🆕 노션 스타일 검색 관련 추가
    searchButton: "p-1 rounded hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100",
    searchIcon: "w-3.5 h-3.5 text-text-tertiary hover:text-accent",
    searchContainer: "flex items-center space-x-2 bg-bg-primary border border-accent rounded px-2 py-1 min-w-48",
    searchInput: "flex-1 bg-transparent text-sm text-text-primary placeholder-text-tertiary focus:outline-none min-w-0",
    searchClearButton: "p-0.5 rounded hover:bg-bg-hover",
    searchClearIcon: "w-3 h-3 text-text-tertiary hover:text-accent"
  },
  
  // 🔍 검색/필터 영역 (기존 - 대형 검색용)
  search: {
    container: "p-4 border-b border-border-primary bg-bg-secondary/50",
    inputWrapper: "relative",
    input: "w-full pl-10 pr-4 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
    inputIcon: "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary",
    clearButton: "absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary hover:text-accent cursor-pointer",
    filterRow: "flex items-center space-x-3 mt-3",
    filterSelect: "px-3 py-1 text-sm border border-border-primary rounded bg-bg-primary text-text-primary",
    activeFilters: "flex items-center space-x-2 mt-2",
    filterTag: "px-2 py-1 text-xs bg-accent-light text-accent rounded-full flex items-center space-x-1",
    filterTagClose: "w-3 h-3 cursor-pointer hover:text-error",
    
    // 🆕 검색 결과 상태 표시
    resultBar: "p-3 bg-accent-light border-t border-border-primary",
    resultText: "text-accent",
    resultClear: "text-accent hover:text-accent/80 font-medium"
  },
  
  // 📜 스크롤 가능한 바디
  body: {
    scrollContainer: "overflow-auto", 
    // 사용 시 동적 높이 설정: style={{ height: '60vh', minHeight: '400px', maxHeight: '800px' }}
    row: {
      base: "border-b border-border-primary hover:bg-bg-hover transition-all duration-200 group cursor-pointer hover:shadow-sm relative"
    },
    cell: "py-2 px-3",
    // 🔍 검색 하이라이트 (개선)
    highlightText: "bg-accent-light text-accent font-medium rounded px-0.5"
  },
  
  // ✅ 노션식 선택 시스템
  selection: {
    // 파란 세로선 (선택 표시)
    indicator: "absolute left-0 top-0 h-full w-1 bg-accent transition-opacity duration-200",
    indicatorVisible: "opacity-100",
    indicatorHidden: "opacity-0",
    
    // 체크박스 시스템
    checkbox: {
      container: "absolute left-1 top-1/2 transform -translate-y-1/2 transition-all duration-200",
      hidden: "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100",
      visible: "opacity-100 scale-100",
      box: "w-4 h-4 rounded border-2 flex items-center justify-center",
      unselected: "border-border-primary bg-bg-primary group-hover:border-accent",
      selected: "bg-accent border-accent",
      checkIcon: "w-2.5 h-2.5 text-white"
    },
    
    // 콘텐츠 밀림 효과
    content: {
      base: "transition-all duration-200",
      unselected: "ml-1 group-hover:ml-6", 
      selected: "ml-6"
    }
  },
  
  // 📊 상태 표시 스타일
  status: {
    success: "px-2 py-1 text-xs rounded-full bg-success-light text-success",
    warning: "px-2 py-1 text-xs rounded-full bg-warning-light text-warning",
    error: "px-2 py-1 text-xs rounded-full bg-error-light text-error",
    info: "px-2 py-1 text-xs rounded-full bg-accent-light text-accent"
  },
  
  // 📄 빈 상태 표시 (개선)
  empty: {
    container: "flex items-center justify-center h-full",
    content: "text-center py-12",
    icon: "w-8 h-8 text-text-tertiary mx-auto mb-2",
    text: "text-text-secondary",
    
    // 🆕 검색 결과 없음 상태
    searchEmpty: {
      icon: "w-8 h-8 text-text-tertiary mx-auto mb-2",
      title: "text-text-secondary mb-2",
      clearButton: "text-accent hover:text-accent/80 text-sm"
    }
  },
  
  // 🏁 목록 끝 표시 (개선)
  footer: {
    container: "py-3 text-center border-t border-border-primary",
    text: "text-xs text-text-tertiary",
    
    // 🆕 검색 결과와 함께 표시될 때
    withSearch: "text-xs text-text-tertiary"
  }
};

/**
 * 테이블 정렬 타입
 */
export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

/**
 * 테이블 검색/필터 타입
 */
export interface SearchConfig {
  query: string;
  column?: string;
  filters: Record<string, string>;
}

/**
 * 테이블 행 선택 시스템을 위한 유틸리티 타입
 */
export interface TableSelectionProps {
  selectedItems: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

/**
 * 테이블 칼럼 정의 타입 (확장)
 */
export interface TableColumn {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  width?: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, record: any, searchQuery?: string) => React.ReactNode;
}