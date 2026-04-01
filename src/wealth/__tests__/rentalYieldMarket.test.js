import { buildRentalYieldMarket } from '../rentalYieldMarket.js'

describe('rental yield market builder', () => {
  it('maps unit data to apartment and builds weighted rollups', () => {
    const yipCsv = [
      'source_dataset_year,postcode,suburb,suburb_key,region_label,property_type,series_window,series_granularity,date,rental_yield_ratio,rental_yield_percent,sales_count_house_source_csv,sales_count_apartment_source_csv,source_url',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,house,10y,yearly,2021-02-28,0.0300,3.0,20,0,https://example.com/a1',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,house,10y,yearly,2022-02-28,0.0310,3.1,20,0,https://example.com/a2',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,house,10y,yearly,2023-02-28,0.0320,3.2,20,0,https://example.com/a3',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,house,10y,yearly,2024-02-29,0.0330,3.3,20,0,https://example.com/a4',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,house,10y,yearly,2025-02-28,0.0340,3.4,20,0,https://example.com/a5',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,house,10y,yearly,2026-02-28,0.0350,3.5,20,0,https://example.com/a6',
      '2025,2001,BETA,region-a:2001:BETA,Region A,house,10y,yearly,2021-02-28,0.0400,4.0,10,0,https://example.com/b1',
      '2025,2001,BETA,region-a:2001:BETA,Region A,house,10y,yearly,2022-02-28,0.0410,4.1,10,0,https://example.com/b2',
      '2025,2001,BETA,region-a:2001:BETA,Region A,house,10y,yearly,2023-02-28,0.0420,4.2,10,0,https://example.com/b3',
      '2025,2001,BETA,region-a:2001:BETA,Region A,house,10y,yearly,2024-02-29,0.0430,4.3,10,0,https://example.com/b4',
      '2025,2001,BETA,region-a:2001:BETA,Region A,house,10y,yearly,2025-02-28,0.0440,4.4,10,0,https://example.com/b5',
      '2025,2001,BETA,region-a:2001:BETA,Region A,house,10y,yearly,2026-02-28,0.0450,4.5,10,0,https://example.com/b6',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,unit,10y,yearly,2021-02-28,0.0500,5.0,0,12,https://example.com/u1',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,unit,10y,yearly,2022-02-28,0.0510,5.1,0,12,https://example.com/u2',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,unit,10y,yearly,2023-02-28,0.0520,5.2,0,12,https://example.com/u3',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,unit,10y,yearly,2024-02-29,0.0530,5.3,0,12,https://example.com/u4',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,unit,10y,yearly,2025-02-28,0.0540,5.4,0,12,https://example.com/u5',
      '2025,2000,ALPHA,region-a:2000:ALPHA,Region A,unit,10y,yearly,2026-02-28,0.0550,5.5,0,12,https://example.com/u6'
    ].join('\n')

    const suburbMetricsCsv = [
      'year,region_key,region_label,postcode,subregion_key,suburb,suburb_key,sales_count_house,sales_count_apartment',
      '2021,region-a,Region A,2000,region-a:2000,ALPHA,region-a:2000:ALPHA,20,12',
      '2022,region-a,Region A,2000,region-a:2000,ALPHA,region-a:2000:ALPHA,20,12',
      '2023,region-a,Region A,2000,region-a:2000,ALPHA,region-a:2000:ALPHA,20,12',
      '2024,region-a,Region A,2000,region-a:2000,ALPHA,region-a:2000:ALPHA,20,12',
      '2025,region-a,Region A,2000,region-a:2000,ALPHA,region-a:2000:ALPHA,20,12',
      '2026,region-a,Region A,2000,region-a:2000,ALPHA,region-a:2000:ALPHA,20,12',
      '2021,region-a,Region A,2001,region-a:2001,BETA,region-a:2001:BETA,10,0',
      '2022,region-a,Region A,2001,region-a:2001,BETA,region-a:2001:BETA,10,0',
      '2023,region-a,Region A,2001,region-a:2001,BETA,region-a:2001:BETA,10,0',
      '2024,region-a,Region A,2001,region-a:2001,BETA,region-a:2001:BETA,10,0',
      '2025,region-a,Region A,2001,region-a:2001,BETA,region-a:2001:BETA,10,0',
      '2026,region-a,Region A,2001,region-a:2001,BETA,region-a:2001:BETA,10,0'
    ].join('\n')

    const market = buildRentalYieldMarket(yipCsv, suburbMetricsCsv)

    expect(market.areasByType.suburb['region-a:2000:ALPHA'].apartment.currentYield).toBeCloseTo(0.055)
    expect(market.areasByType.subregion['region-a:2000'].house.currentYield).toBeCloseTo(0.035)
    expect(market.areasByType.region['region-a'].house.currentYield).toBeCloseTo(((0.035 * 20) + (0.045 * 10)) / 30)
  })
})
