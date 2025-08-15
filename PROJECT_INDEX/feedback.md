
To-Do List
 * Sidebar order
   * Dashboard
   * Inventory
   * Purchase order
   * Repair order
   * Invoice orders
PDF Generation
 * PDF deki sistem Üst yazısı silinecek
 * Kompact bir tasarım bir olması lazım PO tasarımı ve alan kullanımı referans alınabilir. Gereksiz alan ve bilgiden kaçınılmalı. 


 * Purchase order'de alınması gereken bilgiler:
   * Parçaya göre last certificate Repair
   * Obtained from:
   * Treacble to: Airline
     and MSN number and uçak ismi
   * Origin country bilgisi



Sales
 * Invoice orders
   * PDF'lerde Sales order yerine Invoice no kullanılacak. Eğer proforma ile başlaydıysa proforma no bitsin.
   * Dimensions 1 EA BOX (product line sayınıa kadar EA box ekle)
   Dimensions || L W H || Gr.wgt/ Kgs bilgileri optional filedler ekleylim

Freighter AWB # FEDEX account (from ship info) TRACKNING NO (Free text), 


### Data Flow Improvements
- **Issue:** Country of Origin and End Use not flowing from Purchase Orders
- **Solution:** Automatic data inheritance between related records
- **Impact:** Reduced manual data entry, improved accuracy
- **Files:** Database relations, API endpoints


Part Number Management System
- **Requirements:**
  - Full descriptions AND abbreviations for each part
  - Dynamic part creation during data entry (Bu şu demek oluyor. bir paraçayı uniqe bir serial numarasıyla tanımladık ve repair'e gönderiken değiştirdiği yeni seri numarsı gerekebilir. her zaman değil önemli bileşnler tamir edildiği böyle bir durum oluyor. bu bilgini satın alma ve satış ve tamir süreçlerin bu veri güncellem durumu gözetilmeli.)

  ### Dual Inventory Status System
  - **Current:** Single status field
  - **Required:** Two-dimensional tracking
    - **Physical Status:** Depot, In-Repair, In-Transit
    - **Business Status:** Available, Reserved, Sold
  - **Use Cases:**
    - Reserved parts not yet physically received
    - Parts in repair but already sold
    - Complete lifecycle visibility

  ### Part Number Modification During Repair
  - **Business Case:** Software upgrades change part numbers (e.g., 350-0530-2818 � 350-0530-2323)
  - **Requirements:**
    - Track original and modified part numbers
    - Update inventory automatically
    - Maintain traceability chain
    - Generate proper documentation with new part numbers
  - **Implementation:** Repair Order enhancement with part number change capability

  ### Complete Document Package Generation
- **Requirements:**
  - PDF merging for "Full Trace Paperwork"
  - Combine supplier documents + generated documents
  - Single download for complete compliance package
  - Document validation and completeness checking