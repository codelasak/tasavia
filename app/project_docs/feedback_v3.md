Tasavia toplant notları: 

External Company Code generation çalışmadı. 

New Company'da veya New External Company'da oluştururken, buradaki UI, diğer sayfalara uygun değil; onu düzenlemesi lazım. 

Bir de adreste state'leri eklemek gerekiyor. 

Profile Name'in de "Salih İnci" şeklinde olması gerekiyor. 

Obtained From kısmında, yani purchase order'daki satın alan firmanın otoamtik şekilde gelmesi gerekiyor. 

 PDF'lerde üst kısmındaki ve alt kısmındaki yazılar silinmeli ve imza gelsmesi gerekiyor. alanı optimize edilmiş şekline kullanmak gerekiyor. 

PDF'leri generate ederken, oradaki isimlendirmesi de şu şekilde olmalı: Eğer "Purchase Order" ise "Purchase Order number" olacak; eğer "Order" ise, "invoice Order number"ın adı; "Repair Order" ise, "Repair Order number "ın numarası şeklinde olması lazım.

Ayrıca, yani Purchase Order, Sales Order, Repair Order numaralarının hepsi 25300'den başlaması gerekiyor. 

Inventory sayfasında, “In Depot” yerinde "in stock" ibaresi kullanılacak. 

RO yetki hatası veriyor.  

http://localhost:3000/portal/inventory/f35119f9-c7c7-40a4-b8e4-d8ff6e8f8d31 is got something wrong error. 

Invoice order oluştururken, ilk başta müşteri seçilecek ve buna göre “end use country" de otomatik olarak gelecek. 

Daha sonra, inventoryde’den orada parça silecek göre "purchase order"dan veriler çekecek otomatik olarak. Customer Purchase Order Number da *MUST* olacak. 

Reference Number olarak da, external company için oluşturulan kodu, bir de parçanın satın alınmış yani purchase order kullanarak bir reference number oluşturulacak otomatik olarak. 

Contact number'ı da invoice order'ın aynı rakamı paylaştığı için burada otomatik gelecek.

Sales order yani invoice order oluştururken, inventory'den parça seçilirken, location ve quantity de hata verdi. 
Location bilgisi hiçbir yerde kullanılmayacak ve özellikle country, quantity bilgileri N/A şeklinde hata verdi 

Invoice order de "quantity" hatası veriyor. 
Hata vermesine rağmen, invoice orderda list kısmında yeni bir şey oluşturmuş gibi gözüküyor. Ayrıca, PDFlerde de hata vermeye başladı.

