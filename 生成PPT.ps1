# 用 PowerPoint COM 生成数据透视表速成 PPT
$pptFile = "C:\Users\liyou\Downloads\无敌了\青云\招标助理数据透视表速成.pptx"

# 启动 PowerPoint
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $false
$presentation = $ppt.Presentations.Add()

# 幻灯片宽度/高度（英寸）
$slideWidth = 13.333
$slideHeight = 7.5

# 辅助函数：添加文本框
function Add-TextBox {
    param($slide, $left, $top, $width, $height, $text, $fontSize=18, $bold=$false, $color="333333", $align=1)
    $shape = $slide.Shapes.AddTextBox(1, $left, $top, $width, $height)
    $shape.TextFrame.TextRange.Text = $text
    $shape.TextFrame.TextRange.Font.Size = $fontSize
    $shape.TextFrame.TextRange.Font.Bold = $bold
    $shape.TextFrame.TextRange.Font.Color.RGB = [int]"0x00$($color.Substring(4,2))$($color.Substring(2,2))$($color.Substring(0,2))"
    $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $align
    $shape.TextFrame.WordWrap = $true
    return $shape
}

function Add-Table {
    param($slide, $left, $top, $width, $height, $rows, $cols, $data)
    $table = $slide.Shapes.AddTable($rows, $cols, $left, $top, $width, $height).Table
    for ($r = 0; $r -lt $rows; $r++) {
        for ($c = 0; $c -lt $cols; $c++) {
            $cell = $table.Cell($r+1, $c+1)
            $cell.Shape.TextFrame.TextRange.Text = $data[$r][$c]
            $cell.Shape.TextFrame.TextRange.Font.Size = 14
            if ($r -eq 0) {
                $cell.Shape.TextFrame.TextRange.Font.Bold = $true
                $cell.Shape.Fill.ForeColor.RGB = 0x4472C4
                $cell.Shape.TextFrame.TextRange.Font.Color.RGB = 0xFFFFFF
            }
        }
    }
    return $table
}

# ========== 第 1 页：封面 ==========
$slide1 = $presentation.Slides.Add(1, 1)  # ppLayoutTitle

# 背景色
$slide1.Shapes.AddShape(1, 0, 0, $slideWidth*72, $slideHeight*72) | Out-Null
$slide1.Shapes[1].Fill.ForeColor.RGB = 0x1F4E79
$slide1.Shapes[1].Line.Visible = $false

# 标题
Add-TextBox $slide1 72 120 800 100 "招标助理 · 技能速成" 44 $true "FFFFFF" 1
Add-TextBox $slide1 72 230 600 60 "数据透视表 从入门到上手" 28 $false "BDD7EE" 1
Add-TextBox $slide1 72 330 400 50 "3 分钟学会 · 到公司就能用" 20 $false "A6C8E8" 1
Add-TextBox $slide1 72 500 400 40 "祝工作顺利，得心应手！" 18 $false "8DB4E2" 1

# ========== 第 2 页：四框口诀 ==========
$slide2 = $presentation.Slides.Add(2, 1)
Add-TextBox $slide2 36 20 900 60 "核心口诀：四框对应关系" 36 $true "1F4E79" 1

$boxes = @(
    @("行 是 分 类", "行 → 放你想竖着看的字段`n比如：投标人名称、地区", "E74C3C"),
    @("值 是 数 字", "值 → 放你要算的数值`n比如：报价金额、分数", "2ECC71"),
    @("列 是 时 间", "列 → 放横着展开的字段`n比如：月份、标段", "3498DB"),
    @("筛 选 是 过 滤", "筛选 → 只看某一部分`n比如：只看某个月的数据", "F39C12")
)

for ($i = 0; $i -lt 4; $i++) {
    $y = 120 + $i * 130
    $box = $slide2.Shapes.AddShape(1, 80, $y, 780, 110)
    $box.Fill.ForeColor.RGB = [int]"0x00$($boxes[$i][2].Substring(4,2))$($boxes[$i][2].Substring(2,2))$($boxes[$i][2].Substring(0,2))"
    $box.Fill.Transparency = 0.85
    $box.Line.Visible = $false
    
    Add-TextBox $slide2 100 ($y+10) 200 30 $boxes[$i][0] 22 $true "333333" 1
    Add-TextBox $slide2 300 ($y+10) 550 80 $boxes[$i][1] 16 $false "333333" 1
}

# ========== 第 3 页：场景一：投标报名统计 ==========
$slide3 = $presentation.Slides.Add(3, 1)
Add-TextBox $slide3 36 20 900 50 "场景一：投标报名统计" 32 $true "1F4E79" 1
Add-TextBox $slide3 36 70 800 35 "问题：今天报名的投标人来自哪些地区？各有多少家？" 18 $false "555555" 1

$data3 = @(
    @("公司名称", "地区", "联系人"),
    @("武汉建工", "武汉", "张三"),
    @("长沙路桥", "长沙", "李四"),
    @("武汉市政", "武汉", "王五")
)
Add-Table $slide3 80 130 500 120 4 3 $data3

Add-TextBox $slide3 80 280 500 30 "↓ 透视表操作" 18 $true "E74C3C" 1
Add-TextBox $slide3 80 320 500 80 "地区 → 拖到「行」`n公司名称 → 拖到「值」" 18 $false "333333" 1

$result3 = @(
    @("地区", "计数"),
    @("武汉", "2"),
    @("长沙", "1")
)
Add-Table $slide3 80 420 300 100 3 2 $result3

# ========== 第 4 页：场景二：开标报价分析 ==========
$slide4 = $presentation.Slides.Add(4, 1)
Add-TextBox $slide4 36 20 900 50 "场景二：开标报价分析" 32 $true "1F4E79" 1
Add-TextBox $slide4 36 70 900 35 "问题：多家报价，怎么快速看最高/最低/平均？" 18 $false "555555" 1

Add-TextBox $slide4 80 120 600 30 "透视表操作步骤：" 20 $true "333333" 1
Add-TextBox $slide4 80 160 700 160 "1. 投标人 → 拖到「行」`n2. 报价金额 → 拖到「值」（默认求和）`n3. 右键 → 值字段设置 → 改成「平均值」`n4. 再拖一次报价到值 → 改成「最大值」`n5. 再拖一次报价到值 → 改成「最小值」" 16 $false "333333" 1

Add-TextBox $slide4 80 360 700 30 "结果：一个表同时看到各家报价、平均价、最高/最低" 18 $true "2ECC71" 1

# ========== 第 5 页：场景三：评标分数汇总 ==========
$slide5 = $presentation.Slides.Add(5, 1)
Add-TextBox $slide5 36 20 900 50 "场景三：评标分数汇总" 32 $true "1F4E79" 1
Add-TextBox $slide5 36 70 900 35 "问题：5个专家打分，总分排名怎么算？" 18 $false "555555" 1

$data5 = @(
    @("投标人", "专家1", "专家2", "专家3", "总分"),
    @("A公司", "85", "90", "88", "263"),
    @("B公司", "78", "82", "80", "240")
)
Add-Table $slide5 80 120 650 100 3 5 $data5

Add-TextBox $slide5 80 250 700 120 "透视表操作：`n投标人 → 拖到「行」`n专家1、2、3 → 都拖到「值」→ 自动求和`n→ 点总分旁边箭头 → 降序排列" 18 $false "333333" 1

Add-TextBox $slide5 80 400 700 40 "排名一秒出来，谁第一谁第二清清楚楚 👍" 18 $true "2ECC71" 1

# ========== 第 6 页：场景四：月度业务统计 ==========
$slide6 = $presentation.Slides.Add(6, 1)
Add-TextBox $slide6 36 20 900 50 "场景四：月度业务统计" 32 $true "1F4E79" 1
Add-TextBox $slide6 36 70 900 35 "问题：领导问这个月做了几个项目？总金额多少？" 18 $false "555555" 1

$data6 = @(
    @("项目名称", "项目经理", "招标金额", "日期"),
    @("XX道路", "张三", "500万", "2024/6/3"),
    @("XX桥梁", "李四", "800万", "2024/6/15")
)
Add-Table $slide6 80 120 650 100 3 4 $data6

Add-TextBox $slide6 80 250 700 150 "透视表操作：`n日期 → 拖到「行」`n→ 右键日期 → 组合 → 选「月」`n招标金额 → 拖到「值」`n项目名称 → 再拖到「值」（改成计数）" 18 $false "333333" 1

Add-TextBox $slide6 80 430 700 40 "结果：每个月几个项目、多少钱，一眼看完" 18 $true "2ECC71" 1

# ========== 第 7 页：3 个快捷键 ==========
$slide7 = $presentation.Slides.Add(7, 1)
Add-TextBox $slide7 36 20 900 50 "必记快捷键：3 个就够了" 36 $true "1F4E79" 1

$keys = @(
    @("Alt + N + V", "快速创建透视表", "选中数据后一键插入"),
    @("Ctrl + A", "全选数据区域", "数据太多时秒选全部"),
    @("F5", "刷新透视表", "源数据改完后刷新")
)

$keyTable = Add-Table $slide7 80 120 800 150 4 3 @(
    @("快捷键", "作用", "什么时候用"),
    @("Alt + N + V", "快速创建透视表", "选中数据后一键插入"),
    @("Ctrl + A", "全选数据区域", "数据太多时秒选全部"),
    @("F5", "刷新透视表", "源数据改完后刷新")
)

# ========== 第 8 页：总结 ==========
$slide8 = $presentation.Slides.Add(8, 1)
$slide8.Shapes.AddShape(1, 0, 0, $slideWidth*72, $slideHeight*72) | Out-Null
$slide8.Shapes[1].Fill.ForeColor.RGB = 0x1F4E79
$slide8.Shapes[1].Line.Visible = $false

Add-TextBox $slide8 72 80 800 60 "记住这一句话就够了" 36 $true "FFFFFF" 1

$poem = "选中数据点插入`n行分东西值算数`n拖来拖去就出表`n右键刷新别忘了`n`n下次遇到数据统计`n别手动算`n用透视表`n同事看了都说好 👍"
Add-TextBox $slide8 72 180 600 300 $poem 24 $false "BDD7EE" 1

# 保存
$presentation.SaveAs($pptFile)
$presentation.Close()
$ppt.Quit()

Write-Host "PPT 生成成功！文件位置：$pptFile"
