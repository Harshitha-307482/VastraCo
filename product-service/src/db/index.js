const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PRODUCT_DB_HOST || 'localhost',
  port: process.env.PRODUCT_DB_PORT || 5432,
  database: process.env.PRODUCT_DB_NAME || 'products_db',
  user: process.env.PRODUCT_DB_USER || 'vastraco_product',
  password: process.env.PRODUCT_DB_PASSWORD || 'products_pass_123',
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('Connected to Product DB, initializing tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        category_id INTEGER REFERENCES categories(id),
        brand VARCHAR(100),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        size VARCHAR(10) NOT NULL,
        color VARCHAR(50) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        sku VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    // Alter table to add EKS Outfit Planner metadata columns if they don't exist
    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS style VARCHAR(100);
      ALTER TABLE products ADD COLUMN IF NOT EXISTS occasion JSONB DEFAULT '[]'::jsonb;
    `);

    // Helper to get curated, visually distinct photos per category
    const getCuratedPhoto = (categoryName, index) => {
      const photos = {
        "Shirts": ["photo-1596755094514-f87e32f85e2c", "photo-1624378439575-d8705ad7ae80", "photo-1589310243389-96a5483213a8", "photo-1602810318383-e386cc2a3ccf", "photo-1617137968427-85924c800a22", "photo-1598033129183-c4f50c736f10", "photo-1620012253295-c05518e993be", "photo-1607345366928-199ea26cfe3e", "photo-1611312449412-6cefac5dc3e4", "photo-1618354691373-d851c5c3a990", "photo-1588359348347-9bc6cbaa689f", "photo-1593030103066-0093718efeb9"],
        "T-Shirts": ["photo-1521572267360-ee0c2909d518", "photo-1562157873-818bc0726f68", "photo-1583743814966-8936f5b7be1a", "photo-1620612224855-78ffd7d76a7f", "photo-1622445262465-2481974e0d9b", "photo-1529374255404-311a2a4f1fd9", "photo-1492562080023-ab3db95bfbce", "photo-1576566588028-4147f3842f27", "photo-1503342217505-b0a15ec3261c", "photo-1554568218-0f1715e72254", "photo-1574180045827-681f8a1a9622", "photo-1554568218-0f1715e72254"],
        "Polo T-Shirts": ["photo-1581655353564-df123a1eb820", "photo-1618354691373-d851c5c3a990", "photo-1591195853828-11db59a44f6b", "photo-1583743814966-8936f5b7be1a", "photo-1620612224855-78ffd7d76a7f", "photo-1622445262465-2481974e0d9b", "photo-1529374255404-311a2a4f1fd9", "photo-1492562080023-ab3db95bfbce", "photo-1576566588028-4147f3842f27", "photo-1503342217505-b0a15ec3261c", "photo-1554568218-0f1715e72254", "photo-1591195853828-11db59a44f6b"],
        "Blazers": ["photo-1591047139829-d91aecb6caea", "photo-1507679799987-c73779587ccf", "photo-1617137968427-85924c800a22", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1605335193910-c08110b14b43", "photo-1592844306571-08f978ad9468", "photo-1555069513-047245839cd0", "photo-1549417229-aa67d3263c09", "photo-1548883354-7622d03aca27", "photo-1569466896818-36c51225b364", "photo-1534528741775-53994a69daeb"],
        "Suits": ["photo-1601662528567-526d00147750", "photo-1603251525042-421711281862", "photo-1598808503746-f335b1d4c72d", "photo-1594938298603-c8148c4dae35", "photo-1593030103066-0093718efeb9", "photo-1605335193910-c08110b14b43", "photo-1592844306571-08f978ad9468", "photo-1555069513-047245839cd0", "photo-1549417229-aa67d3263c09", "photo-1548883354-7622d03aca27", "photo-1569466896818-36c51225b364", "photo-1534528741775-53994a69daeb"],
        "Trousers": ["photo-1624378439575-d8705ad7ae80", "photo-1541099649105-f69ad21f3246", "photo-1479064555552-3ef4979f8908", "photo-1584370848010-d7fe6bc767ec", "photo-1576995853123-5a10305d93c0", "photo-1594633312681-425c7b97ccd1", "photo-1602810318383-e386cc2a3ccf", "photo-1552374196-1d2a4507bfda", "photo-1617137968427-85924c800a22", "photo-1620012253295-c05518e993be", "photo-1607345366928-199ea26cfe3e", "photo-1611312449412-6cefac5dc3e4"],
        "Jeans": ["photo-1542272604-787c3835535d", "photo-1584370848010-d7fe6bc767ec", "photo-1576995853123-5a10305d93c0", "photo-1594633312681-425c7b97ccd1", "photo-1602810318383-e386cc2a3ccf", "photo-1552374196-1d2a4507bfda", "photo-1598033129183-c4f50c736f10", "photo-1617137968427-85924c800a22", "photo-1620012253295-c05518e993be", "photo-1607345366928-199ea26cfe3e", "photo-1611312449412-6cefac5dc3e4", "photo-1588359348347-9bc6cbaa689f"],
        "Chinos": ["photo-1479064555552-3ef4979f8908", "photo-1624378439575-d8705ad7ae80", "photo-1541099649105-f69ad21f3246", "photo-1584370848010-d7fe6bc767ec", "photo-1576995853123-5a10305d93c0", "photo-1594633312681-425c7b97ccd1", "photo-1602810318383-e386cc2a3ccf", "photo-1552374196-1d2a4507bfda", "photo-1617137968427-85924c800a22", "photo-1620012253295-c05518e993be", "photo-1607345366928-199ea26cfe3e", "photo-1611312449412-6cefac5dc3e4"],
        "Kurta": ["photo-1603415526960-f7e0328c63b1", "photo-1610030470390-34444c9b2923", "photo-1583391733958-d25e07fac0ec", "photo-1613206484394-b2586bf7fbfa", "photo-1610030469983-98e550d6193c", "photo-1611601679655-7c8bc197f0c6", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80"],
        "Sherwani": ["photo-1610030470390-34444c9b2923", "photo-1603415526960-f7e0328c63b1", "photo-1583391733958-d25e07fac0ec", "photo-1613206484394-b2586bf7fbfa", "photo-1610030469983-98e550d6193c", "photo-1611601679655-7c8bc197f0c6", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80"],
        "Jackets": ["photo-1551028719-00167b16eac5", "photo-1591047139829-d91aecb6caea", "photo-1598033129183-c4f50c736f10", "photo-1617137968427-85924c800a22", "photo-1602810318383-e386cc2a3ccf", "photo-1620012253295-c05518e993be", "photo-1607345366928-199ea26cfe3e", "photo-1611312449412-6cefac5dc3e4", "photo-1549417229-aa67d3263c09", "photo-1548883354-7622d03aca27", "photo-1569466896818-36c51225b364", "photo-1534528741775-53994a69daeb"],
        "Sarees": ["photo-1610030469983-98e550d6193c", "photo-1583391733958-d25e07fac0ec", "photo-1613206484394-b2586bf7fbfa", "photo-1611601679655-7c8bc197f0c6", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80", "photo-1551028719-00167b16eac5", "photo-1617137968427-85924c800a22"],
        "Lehengas": ["photo-1611601679655-7c8bc197f0c6", "photo-1603415526960-f7e0328c63b1", "photo-1610030470390-34444c9b2923", "photo-1583391733958-d25e07fac0ec", "photo-1613206484394-b2586bf7fbfa", "photo-1610030469983-98e550d6193c", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80"],
        "Kurtis": ["photo-1583391733958-d25e07fac0ec", "photo-1613206484394-b2586bf7fbfa", "photo-1610030469983-98e550d6193c", "photo-1611601679655-7c8bc197f0c6", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80", "photo-1551028719-00167b16eac5", "photo-1617137968427-85924c800a22"],
        "Salwar Suits": ["photo-1610030469983-98e550d6193c", "photo-1583391733958-d25e07fac0ec", "photo-1613206484394-b2586bf7fbfa", "photo-1611601679655-7c8bc197f0c6", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80", "photo-1551028719-00167b16eac5", "photo-1617137968427-85924c800a22"],
        "Anarkalis": ["photo-1613206484394-b2586bf7fbfa", "photo-1610030469983-98e550d6193c", "photo-1583391733958-d25e07fac0ec", "photo-1611601679655-7c8bc197f0c6", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80", "photo-1551028719-00167b16eac5", "photo-1617137968427-85924c800a22"],
        "Dresses": ["photo-1572804013309-59a88b7e92f1", "photo-1566174053879-31528523f8ae", "photo-1583496661160-fb5886a0aaaa", "photo-1515886657613-9f3515b0c78f", "photo-1503342217505-b0a15ec3261c", "photo-1595777457583-95e059d581b8", "photo-1618244972963-dbee1a7edc95", "photo-1609357518652-6cf0416f0cbe", "photo-1496747611176-843222e1e57c", "photo-1502716119720-b23a93e5fe1b", "photo-1529139574466-a303027c1d8b", "photo-1490481651871-ab68de25d43d"],
        "Gowns": ["photo-1566174053879-31528523f8ae", "photo-1572804013309-59a88b7e92f1", "photo-1583496661160-fb5886a0aaaa", "photo-1515886657613-9f3515b0c78f", "photo-1503342217505-b0a15ec3261c", "photo-1595777457583-95e059d581b8", "photo-1618244972963-dbee1a7edc95", "photo-1609357518652-6cf0416f0cbe", "photo-1496747611176-843222e1e57c", "photo-1502716119720-b23a93e5fe1b", "photo-1529139574466-a303027c1d8b", "photo-1490481651871-ab68de25d43d"],
        "Skirts": ["photo-1583496661160-fb5886a0aaaa", "photo-1572804013309-59a88b7e92f1", "photo-1566174053879-31528523f8ae", "photo-1515886657613-9f3515b0c78f", "photo-1503342217505-b0a15ec3261c", "photo-1595777457583-95e059d581b8", "photo-1618244972963-dbee1a7edc95", "photo-1609357518652-6cf0416f0cbe", "photo-1496747611176-843222e1e57c", "photo-1502716119720-b23a93e5fe1b", "photo-1529139574466-a303027c1d8b", "photo-1490481651871-ab68de25d43d"],
        "Crop Tops": ["photo-1515886657613-9f3515b0c78f", "photo-1572804013309-59a88b7e92f1", "photo-1566174053879-31528523f8ae", "photo-1583496661160-fb5886a0aaaa", "photo-1503342217505-b0a15ec3261c", "photo-1595777457583-95e059d581b8", "photo-1618244972963-dbee1a7edc95", "photo-1609357518652-6cf0416f0cbe", "photo-1496747611176-843222e1e57c", "photo-1502716119720-b23a93e5fe1b", "photo-1529139574466-a303027c1d8b", "photo-1490481651871-ab68de25d43d"],
        "Blouses": ["photo-1503342217505-b0a15ec3261c", "photo-1610030469983-98e550d6193c", "photo-1583391733958-d25e07fac0ec", "photo-1613206484394-b2586bf7fbfa", "photo-1611601679655-7c8bc197f0c6", "photo-1599643478518-a784e5dc4c8f", "photo-1605100804763-247f67b3557e", "photo-1507679799987-c73779587ccf", "photo-1593030103066-0093718efeb9", "photo-1594938298603-c8148c4dae35", "photo-1624378439575-d8705ad7ae80", "photo-1551028719-00167b16eac5"],
        "Formal Shoes": ["photo-1533867617858-e7b97e060509", "photo-1549298916-b41d501d3772", "photo-1531310197839-ccf54634509e", "photo-1608256246200-53e635b5b65f", "photo-1600185365483-26d7a4cc7519", "photo-1542291026-7eec264c27ff", "photo-1595950653106-6c9ebd614d3a", "photo-1539185441755-769473a23570", "photo-1606107557195-0e29a4b5b4aa", "photo-1551107696-a4b0c5a0d9a2", "photo-1460353581641-37baddab0fa2", "photo-1491553895911-0055eca6402d"],
        "Loafers": ["photo-1542838741-26c7d3d29b11", "photo-1593030761757-710e46d9a744", "photo-1553168170-4f51952a221f", "photo-1608256246200-53e635b5b65f", "photo-1600185365483-26d7a4cc7519", "photo-1542291026-7eec264c27ff", "photo-1595950653106-6c9ebd614d3a", "photo-1539185441755-769473a23570", "photo-1606107557195-0e29a4b5b4aa", "photo-1551107696-a4b0c5a0d9a2", "photo-1460353581641-37baddab0fa2", "photo-1491553895911-0055eca6402d"],
        "Sneakers": ["photo-1549298916-b41d501d3772", "photo-1606107557195-0e29a4b5b4aa", "photo-1542291026-7eec264c27ff", "photo-1595950653106-6c9ebd614d3a", "photo-1608231387042-66d1773070a5", "photo-1607522370275-f14206abe5d3", "photo-1551107696-a4b0c5a0d9a2", "photo-1460353581641-37baddab0fa2", "photo-1491553895911-0055eca6402d", "photo-1600185365483-26d7a4cc7519", "photo-1539185441755-769473a23570", "photo-1512374382149-433853003064"],
        "Heels": ["photo-1543163521-1bf539c55dd2", "photo-1595950653106-6c9ebd614d3a", "photo-1539185441755-769473a23570", "photo-1549298916-b41d501d3772", "photo-1608256246200-53e635b5b65f", "photo-1600185365483-26d7a4cc7519", "photo-1542291026-7eec264c27ff", "photo-1606107557195-0e29a4b5b4aa", "photo-1551107696-a4b0c5a0d9a2", "photo-1460353581641-37baddab0fa2", "photo-1491553895911-0055eca6402d", "photo-1560343090-f0409e92791a"],
        "Flats": ["photo-1560343090-f0409e92791a", "photo-1595950653106-6c9ebd614d3a", "photo-1539185441755-769473a23570", "photo-1549298916-b41d501d3772", "photo-1608256246200-53e635b5b65f", "photo-1600185365483-26d7a4cc7519", "photo-1542291026-7eec264c27ff", "photo-1606107557195-0e29a4b5b4aa", "photo-1551107696-a4b0c5a0d9a2", "photo-1460353581641-37baddab0fa2", "photo-1491553895911-0055eca6402d", "photo-1543163521-1bf539c55dd2"],
        "Sandals": ["photo-1603252109303-2751441dd157", "photo-1595950653106-6c9ebd614d3a", "photo-1539185441755-769473a23570", "photo-1549298916-b41d501d3772", "photo-1608256246200-53e635b5b65f", "photo-1600185365483-26d7a4cc7519", "photo-1542291026-7eec264c27ff", "photo-1606107557195-0e29a4b5b4aa", "photo-1551107696-a4b0c5a0d9a2", "photo-1460353581641-37baddab0fa2", "photo-1491553895911-0055eca6402d", "photo-1543163521-1bf539c55dd2"],
        "Watches": ["photo-1524805444758-089113d48a6d", "photo-1542496658-e33a6d0d50f6", "photo-1522312346375-d1a52e2b99b3", "photo-1614162692292-7ac56d7f7f1e", "photo-1612817288484-6f916006741a", "photo-1509048191080-d2984bad6ae5", "photo-1539874754764-5a96559165b0", "photo-1523275335684-37898b6baf30", "photo-1508685096489-7aacd43bd3b1", "photo-1526045431048-f857369aba09", "photo-1546868871-7041f2a55e12", "photo-1509048191080-d2984bad6ae5"],
        "Belts": ["photo-1624222247566-5f8240026814", "photo-1617137984095-74e4e5e3613f", "photo-1607522370275-f14206abe5d3", "photo-1553062407-98eeb64c6a62", "photo-1598033129183-c4f50c736f10", "photo-1620012253295-c05518e993be", "photo-1607345366928-199ea26cfe3e", "photo-1611312449412-6cefac5dc3e4", "photo-1589310243389-96a5483213a8", "photo-1602810318383-e386cc2a3ccf", "photo-1617137968427-85924c800a22", "photo-1596755094514-f87e32f85e2c"],
        "Wallets": ["photo-1627124112126-efd6ad15583b", "photo-1627124112126-efd6ad15583b", "photo-1606503820612-4cfdf3e8e19e", "photo-1584917865442-de89df76afd3", "photo-1590874103328-eac38a683ce7", "photo-1566150905458-1bf1fc15a7a5", "photo-1600857062241-98e5dba7f214", "photo-1591561954557-26941169b49e", "photo-1601924994987-69e26d50dc26", "photo-1547949003-9792a18a2601", "photo-1614179924047-e1cb49a0959d", "photo-1598532187856-327248195b01"],
        "Sunglasses": ["photo-1511499767150-a48a237f0083", "photo-1572635196237-14b3f281503f", "photo-1577803645773-f96470509666", "photo-1608042314453-ae338d80c427", "photo-1598560917505-59a3ad559071", "photo-1543294001-f7cbfe92237e", "photo-1535632066927-ab7c9ab60908", "photo-1611591437281-460bfbe1220a", "photo-1605100821642-4c0f837332ec", "photo-1614713570650-25c1cb30c6a9", "photo-1598033129183-c4f50c736f10", "photo-1617137968427-85924c800a22"],
        "Earrings": ["photo-1630019852942-f89202989a59", "photo-1617038260897-41a1f14a8ca0", "photo-1599643478518-a784e5dc4c8f", "photo-1605100821642-4c0f837332ec", "photo-1630019852942-f89202989a59", "photo-1589674781759-c21c37956a44", "photo-1608042314453-ae338d80c427", "photo-1598560917505-59a3ad559071", "photo-1543294001-f7cbfe92237e", "photo-1611591437281-460bfbe1220a", "photo-1506630448388-4e683c67ddb0", "photo-1605100804763-247f67b3557e"],
        "Bangles": ["photo-1599643478518-a784e5dc4c8f", "photo-1611085583191-a3b1a20a5a4a", "photo-1602751584552-8ba73aad10e1", "photo-1535632066927-ab7c9ab60908", "photo-1617038260897-41a1f14a8ca0", "photo-1605100821642-4c0f837332ec", "photo-1630019852942-f89202989a59", "photo-1589674781759-c21c37956a44", "photo-1608042314453-ae338d80c427", "photo-1598560917505-59a3ad559071", "photo-1543294001-f7cbfe92237e", "photo-1611591437281-460bfbe1220a"],
        "Necklaces": ["photo-1599643478518-a784e5dc4c8f", "photo-1602751584552-8ba73aad10e1", "photo-1611085583191-a3b1a20a5a4a", "photo-1617038260897-41a1f14a8ca0", "photo-1535632066927-ab7c9ab60908", "photo-1605100821642-4c0f837332ec", "photo-1630019852942-f89202989a59", "photo-1589674781759-c21c37956a44", "photo-1608042314453-ae338d80c427", "photo-1598560917505-59a3ad559071", "photo-1543294001-f7cbfe92237e", "photo-1611591437281-460bfbe1220a"],
        "Rings": ["photo-1605100804763-247f67b3557e", "photo-1603561591411-07134e71a2a9", "photo-1589674781759-c21c37956a44", "photo-1617038260897-41a1f14a8ca0", "photo-1598560917505-59a3ad559071", "photo-1608042314453-ae338d80c427", "photo-1543294001-f7cbfe92237e", "photo-1535632066927-ab7c9ab60908", "photo-1611591437281-460bfbe1220a", "photo-1605100821642-4c0f837332ec", "photo-1506630448388-4e683c67ddb0", "photo-1605100804763-247f67b3557e"],
        "Handbags": ["photo-1584917865442-de89df76afd3", "photo-1590874103328-eac38a683ce7", "photo-1566150905458-1bf1fc15a7a5", "photo-1600857062241-98e5dba7f214", "photo-1591561954557-26941169b49e", "photo-1601924994987-69e26d50dc26", "photo-1547949003-9792a18a2601", "photo-1614179924047-e1cb49a0959d", "photo-1598532187856-327248195b01", "photo-1605733513597-a8f8d410f286", "photo-1607522370275-f14206abe5d3", "photo-1622560480605-d83c853bc5c3"],
        "Clutches": ["photo-1566150905458-1bf1fc15a7a5", "photo-1584917865442-de89df76afd3", "photo-1590874103328-eac38a683ce7", "photo-1600857062241-98e5dba7f214", "photo-1591561954557-26941169b49e", "photo-1601924994987-69e26d50dc26", "photo-1547949003-9792a18a2601", "photo-1614179924047-e1cb49a0959d", "photo-1598532187856-327248195b01", "photo-1605733513597-a8f8d410f286", "photo-1607522370275-f14206abe5d3", "photo-1622560480605-d83c853bc5c3"]
      };
      const catPhotos = photos[categoryName] || [];
      return catPhotos[index % catPhotos.length];
    };

      const categoryConfig = {
        // Men's Wear
        "Shirts": { gender: "Male", count: 12, minPrice: 799, maxPrice: 1999, styles: ["Formal", "Casual"], brands: ["Raymond", "Allen Solly", "Peter England"], colors: ["White", "Blue", "Black", "Grey", "Pink"], occasions: ["Office", "Farewell", "Interview"] },
        "T-Shirts": { gender: "Male", count: 12, minPrice: 499, maxPrice: 1499, styles: ["Casual", "Sporty"], brands: ["Nike", "Adidas", "Puma", "Levis"], colors: ["Black", "White", "Red", "Grey", "Green"], occasions: ["Casual Outing", "College"] },
        "Polo T-Shirts": { gender: "Male", count: 8, minPrice: 699, maxPrice: 1799, styles: ["Casual", "Sporty"], brands: ["Polo Ralph Lauren", "Lacoste", "U.S. Polo"], colors: ["Navy", "Red", "Green", "White", "Yellow"], occasions: ["Casual Outing", "College"] },
        "Blazers": { gender: "Male", count: 8, minPrice: 2999, maxPrice: 6999, styles: ["Formal", "Western"], brands: ["Raymond", "Louis Philippe", "Zara"], colors: ["Navy", "Black", "Grey", "Beige"], occasions: ["Wedding", "Farewell", "Office", "Engagement"] },
        "Suits": { gender: "Male", count: 8, minPrice: 4999, maxPrice: 14999, styles: ["Formal", "Western"], brands: ["Raymond", "Van Heusen", "Louis Philippe"], colors: ["Black", "Navy", "Charcoal"], occasions: ["Wedding", "Engagement", "Farewell"] },
        "Trousers": { gender: "Male", count: 10, minPrice: 999, maxPrice: 2499, styles: ["Formal"], brands: ["Park Avenue", "Blackberrys", "Van Heusen"], colors: ["Black", "Grey", "Beige", "Navy"], occasions: ["Office", "Interview", "Wedding"] },
        "Jeans": { gender: "Male", count: 10, minPrice: 999, maxPrice: 2499, styles: ["Casual"], brands: ["Levis", "Wrangler", "Pepe Jeans"], colors: ["Blue", "Black", "Grey"], occasions: ["Casual Outing", "College"] },
        "Chinos": { gender: "Male", count: 8, minPrice: 999, maxPrice: 2499, styles: ["Casual", "Formal"], brands: ["Zara", "Tommy Hilfiger", "U.S. Polo"], colors: ["Beige", "Khaki", "Olive", "Navy"], occasions: ["Casual Outing", "College", "Office"] },
        "Kurta": { gender: "Male", count: 8, minPrice: 799, maxPrice: 1999, styles: ["Traditional"], brands: ["Manyavar", "FabIndia", "Biba"], colors: ["Yellow", "White", "Red", "Blue", "Orange"], occasions: ["Wedding", "Festive", "Engagement"] },
        "Sherwani": { gender: "Male", count: 5, minPrice: 4999, maxPrice: 14999, styles: ["Traditional"], brands: ["Manyavar", "Sabyasachi"], colors: ["Beige", "Gold", "Maroon", "Cream"], occasions: ["Wedding", "Engagement"] },
        "Jackets": { gender: "Male", count: 8, minPrice: 999, maxPrice: 2499, styles: ["Casual", "Western"], brands: ["Woodland", "Wildcraft", "Jack & Jones"], colors: ["Black", "Brown", "Olive"], occasions: ["Casual Outing", "College"] },
        
        // Women's Wear
        "Sarees": { gender: "Female", count: 12, minPrice: 1499, maxPrice: 9999, styles: ["Traditional"], brands: ["Suta", "Nalli", "FabIndia"], colors: ["Red", "Gold", "Black", "Green", "Pink"], occasions: ["Wedding", "Festive", "Farewell"] },
        "Lehengas": { gender: "Female", count: 8, minPrice: 3999, maxPrice: 19999, styles: ["Traditional"], brands: ["Kalki Fashion", "Biba", "Manyavar"], colors: ["Pink", "Gold", "Red", "Blue"], occasions: ["Wedding", "Engagement", "Festive"] },
        "Kurtis": { gender: "Female", count: 12, minPrice: 699, maxPrice: 2499, styles: ["Traditional", "Casual"], brands: ["W", "Aurelia", "Biba"], colors: ["Blue", "Yellow", "White", "Pink", "Green"], occasions: ["College", "Casual Outing", "Office"] },
        "Salwar Suits": { gender: "Female", count: 10, minPrice: 999, maxPrice: 3999, styles: ["Traditional"], brands: ["Biba", "Libas", "W"], colors: ["Red", "Blue", "Green", "Beige"], occasions: ["Festive", "Wedding", "Casual Outing"] },
        "Anarkalis": { gender: "Female", count: 8, minPrice: 1499, maxPrice: 9999, styles: ["Traditional"], brands: ["Libas", "Biba", "Manyavar"], colors: ["Blue", "Green", "Maroon", "Yellow"], occasions: ["Wedding", "Engagement", "Festive"] },
        "Dresses": { gender: "Female", count: 12, minPrice: 999, maxPrice: 3999, styles: ["Casual", "Western"], brands: ["Zara", "H&M", "Vero Moda"], colors: ["Red", "Black", "Yellow", "Pink", "Floral"], occasions: ["Casual Outing", "College", "Farewell"] },
        "Gowns": { gender: "Female", count: 8, minPrice: 1999, maxPrice: 9999, styles: ["Western"], brands: ["Mango", "Zara", "Vero Moda"], colors: ["Black", "Red", "Navy", "Silver"], occasions: ["Wedding", "Farewell", "Engagement"] },
        "Skirts": { gender: "Female", count: 8, minPrice: 699, maxPrice: 2499, styles: ["Casual", "Western"], brands: ["H&M", "Only", "Zara"], colors: ["Black", "Blue", "Grey", "Red"], occasions: ["Casual Outing", "College"] },
        "Crop Tops": { gender: "Female", count: 8, minPrice: 499, maxPrice: 1499, styles: ["Casual", "Western"], brands: ["Forever 21", "H&M", "Zara"], colors: ["White", "Black", "Pink", "Yellow"], occasions: ["Casual Outing", "College"] },
        "Blouses": { gender: "Female", count: 10, minPrice: 499, maxPrice: 1999, styles: ["Traditional"], brands: ["Nalli", "Suta"], colors: ["Gold", "Red", "Black", "Green", "Pink"], occasions: ["Wedding", "Festive", "Farewell"] },
        
        // Footwear
        "Formal Shoes": { gender: "Male", count: 6, minPrice: 1499, maxPrice: 4999, styles: ["Formal"], brands: ["Bata", "Hush Puppies", "Clarks"], colors: ["Black", "Brown", "Tan"], occasions: ["Office", "Interview", "Wedding"] },
        "Loafers": { gender: "Unisex", count: 6, minPrice: 1499, maxPrice: 4999, styles: ["Casual", "Formal"], brands: ["Woodland", "Bata", "Clarks"], colors: ["Tan", "Brown", "Black", "Navy"], occasions: ["Casual Outing", "College", "Office"] },
        "Sneakers": { gender: "Unisex", count: 8, minPrice: 1499, maxPrice: 4999, styles: ["Casual", "Sporty"], brands: ["Nike", "Adidas", "Puma", "Converse"], colors: ["White", "Black", "Grey", "Red"], occasions: ["Casual Outing", "College"] },
        "Heels": { gender: "Female", count: 6, minPrice: 999, maxPrice: 3999, styles: ["Formal", "Western"], brands: ["Catwalk", "Inc.5", "Metro"], colors: ["Black", "Gold", "Silver", "Nude"], occasions: ["Wedding", "Farewell", "Engagement"] },
        "Flats": { gender: "Female", count: 6, minPrice: 699, maxPrice: 2499, styles: ["Casual", "Traditional"], brands: ["Catwalk", "Bata", "Metro"], colors: ["Beige", "Black", "Pink", "Gold"], occasions: ["Casual Outing", "College", "Festive"] },
        "Sandals": { gender: "Unisex", count: 6, minPrice: 699, maxPrice: 2499, styles: ["Casual", "Traditional"], brands: ["Bata", "Woodland", "Crocs"], colors: ["Brown", "Black", "Tan"], occasions: ["Casual Outing", "Festive"] },
        
        // Accessories
        "Watches": { gender: "Unisex", count: 8, minPrice: 999, maxPrice: 9999, styles: ["Formal", "Western"], brands: ["Titan", "Casio", "Fossil"], colors: ["Silver", "Black", "Gold", "Brown"], occasions: ["Office", "Wedding", "Farewell"] },
        "Belts": { gender: "Unisex", count: 6, minPrice: 499, maxPrice: 1499, styles: ["Formal", "Casual"], brands: ["Levi's", "Bata", "Tommy Hilfiger"], colors: ["Black", "Brown", "Tan"], occasions: ["Office", "Casual Outing", "Wedding"] },
        "Wallets": { gender: "Unisex", count: 6, minPrice: 499, maxPrice: 1999, styles: ["Casual", "Formal"], brands: ["Hidesign", "Wildhorn", "Titan"], colors: ["Black", "Brown", "Tan"], occasions: ["Casual Outing", "Office"] },
        "Sunglasses": { gender: "Unisex", count: 6, minPrice: 499, maxPrice: 2999, styles: ["Casual", "Western"], brands: ["Ray-Ban", "Fastrack", "Oakley"], colors: ["Black", "Brown", "Gold"], occasions: ["Casual Outing", "College", "Wedding"] },
        "Earrings": { gender: "Female", count: 10, minPrice: 199, maxPrice: 1999, styles: ["Traditional"], brands: ["Giva", "Tanishq", "Voylla"], colors: ["Gold", "Silver", "Pink"], occasions: ["Wedding", "Festive", "Farewell"] },
        "Bangles": { gender: "Female", count: 10, minPrice: 199, maxPrice: 1499, styles: ["Traditional"], brands: ["Tanishq", "FabIndia"], colors: ["Red", "Gold", "Green", "Pink"], occasions: ["Wedding", "Festive", "Engagement"] },
        "Necklaces": { gender: "Female", count: 8, minPrice: 499, maxPrice: 4999, styles: ["Traditional"], brands: ["Giva", "Tanishq"], colors: ["Gold", "Silver", "White"], occasions: ["Wedding", "Engagement", "Festive"] },
        "Rings": { gender: "Unisex", count: 10, minPrice: 299, maxPrice: 2999, styles: ["Casual", "Formal"], brands: ["Giva", "Tanishq"], colors: ["Silver", "Gold"], occasions: ["Wedding", "Engagement", "Casual Outing"] },
        "Handbags": { gender: "Female", count: 8, minPrice: 999, maxPrice: 4999, styles: ["Western"], brands: ["Lavie", "Caprese", "Lino Perros"], colors: ["Black", "Beige", "Tan", "Pink"], occasions: ["Office", "Casual Outing", "Farewell"] },
        "Clutches": { gender: "Female", count: 6, minPrice: 499, maxPrice: 2999, styles: ["Traditional", "Western"], brands: ["Lavie", "Caprese"], colors: ["Gold", "Silver", "Black", "Red"], occasions: ["Wedding", "Farewell", "Engagement"] }
      };

      const categories = Object.keys(categoryConfig);
      const catMap = {};

      for (const catName of categories) {
        const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const res = await client.query(
          'INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id',
          [catName, slug]
        );
        catMap[catName] = res.rows[0].id;
      }

      const prodCheck = await client.query('SELECT COUNT(*) FROM products');
      if (parseInt(prodCheck.rows[0].count) < 50) {
        console.log('Seeding products...');
        for (const catName of categories) {
          const config = categoryConfig[catName];
          
          for (let i = 0; i < config.count; i++) {
            const brand = config.brands[i % config.brands.length];
            const color = config.colors[i % config.colors.length];
            const style = config.styles[i % config.styles.length];
            
            // Realistic Price Boundaries Clamping & Niceness
            const rawPrice = config.minPrice + Math.floor(Math.random() * (config.maxPrice - config.minPrice + 1));
            const price = Math.min(config.maxPrice, Math.max(config.minPrice, Math.round(rawPrice / 10) * 10 - 1));
            
            const name = `${brand} ${color} ${style} ${catName.replace(/s$/, '')} V-${i+1}`;
            const description = `A premium ${style.toLowerCase()} ${catName.toLowerCase()} designed by ${brand}. Crafted with high-grade materials in ${color.toLowerCase()}, perfect for ${config.occasions.join(' or ')} wear. Offers unmatched comfort and durability.`;
            
            // Visually distinct photo generation using the curated lists
            const photoId = getCuratedPhoto(catName, i);
            const imageUrl = `https://images.unsplash.com/${photoId}?w=500&auto=format&fit=crop&q=80`;
            
            const pResult = await client.query(
              `INSERT INTO products (name, description, price, category_id, brand, image_url, gender, style, occasion) 
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
              [name, description, price, catMap[catName], brand, imageUrl, config.gender, style, JSON.stringify(config.occasions)]
            );
            const productId = pResult.rows[0].id;

            // Seed 3 variants for each product
            let sizes = ['S', 'M', 'L', 'XL'];
            if (catName.includes("Shoes") || catName.includes("Loafers") || catName.includes("Sneakers") || catName.includes("Heels") || catName.includes("Flats") || catName.includes("Sandals")) {
              sizes = ['7', '8', '9', '10'];
            } else if (["Watches", "Belts", "Wallets", "Sunglasses", "Earrings", "Bangles", "Necklaces", "Rings", "Handbags", "Clutches"].includes(catName)) {
              sizes = ['One Size'];
            }

            const varColors = [color];
            // Get other colors
            for (const c of config.colors) {
              if (varColors.length < 3 && c !== color) {
                varColors.push(c);
              }
            }

            for (let j = 0; j < varColors.length; j++) {
              const size = sizes[j % sizes.length];
              const varColor = varColors[j];
              const stock = Math.floor(Math.random() * 80) + 20; // 20 to 100
              const sku = `SKU-${productId.substring(0, 5)}-${size.replace(/\s+/g, '')}-${varColor}-${j}`;

              await client.query(
                `INSERT INTO product_variants (product_id, size, color, stock_quantity, sku) 
                 VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
                [productId, size, varColor, stock, sku]
              );
            }
          }
        }
        console.log('Seed data inserted.');
      } else {
        console.log('Product catalog already seeded. Skipping product seeding.');
      }
    
    console.log('Product DB initialization complete.');
  } catch (err) {
    console.error('Error initializing Product DB', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDb,
  pool
};
