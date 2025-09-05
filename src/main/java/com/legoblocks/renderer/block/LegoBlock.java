package com.legoblocks.renderer.block;

import com.legoblocks.renderer.init.ModTileEntities;
import com.legoblocks.renderer.tileentity.LegoBlockTileEntity;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.BaseEntityBlock;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.shapes.BooleanOp;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;

import javax.annotation.Nullable;

public class LegoBlock extends BaseEntityBlock {
    private final BrickType brickType;
    
    // Define collision shapes for different brick types
    private static final VoxelShape SHAPE_1X1 = Shapes.join(
            Shapes.box(0.0625, 0, 0.0625, 0.9375, 0.6, 0.9375), // Base
            Shapes.box(0.25, 0.6, 0.25, 0.75, 0.9, 0.75), // Stud
            BooleanOp.OR);
    
    private static final VoxelShape SHAPE_2X2 = Shapes.join(
            Shapes.box(0, 0, 0, 1, 0.6, 1), // Base
            Shapes.join(
                Shapes.box(0.125, 0.6, 0.125, 0.375, 0.9, 0.375), // Stud 1
                Shapes.join(
                    Shapes.box(0.625, 0.6, 0.125, 0.875, 0.9, 0.375), // Stud 2
                    Shapes.join(
                        Shapes.box(0.125, 0.6, 0.625, 0.375, 0.9, 0.875), // Stud 3
                        Shapes.box(0.625, 0.6, 0.625, 0.875, 0.9, 0.875), // Stud 4
                        BooleanOp.OR), BooleanOp.OR), BooleanOp.OR),
            BooleanOp.OR);
    
    private static final VoxelShape SHAPE_2X4 = Shapes.join(
            Shapes.box(0, 0, 0, 1, 0.6, 2), // Base (extends to z=2)
            createStudsForShape(2, 4), // 2x4 studs
            BooleanOp.OR);
    
    private static final VoxelShape SHAPE_SLOPE = Shapes.join(
            Shapes.box(0, 0, 0, 1, 0.3, 1), // Lower base
            Shapes.box(0, 0.3, 0.5, 1, 0.6, 1), // Upper half
            BooleanOp.OR);
    
    private static final VoxelShape SHAPE_CORNER = Shapes.join(
            Shapes.box(0, 0, 0, 1, 0.6, 1), // Base
            Shapes.box(0.125, 0.6, 0.125, 0.375, 0.9, 0.375), // Corner stud
            BooleanOp.OR);

    public enum BrickType {
        BRICK_1X1, BRICK_2X2, BRICK_2X4, SLOPE, CORNER
    }

    public LegoBlock(Properties properties, BrickType brickType) {
        super(properties);
        this.brickType = brickType;
    }

    @Override
    public RenderShape getRenderShape(BlockState state) {
        return RenderShape.ENTITYBLOCK_ANIMATED; // Use tile entity renderer
    }

    @Override
    public VoxelShape getShape(BlockState state, BlockGetter worldIn, BlockPos pos, CollisionContext context) {
        return switch (brickType) {
            case BRICK_1X1 -> SHAPE_1X1;
            case BRICK_2X2 -> SHAPE_2X2;
            case BRICK_2X4 -> SHAPE_2X4;
            case SLOPE -> SHAPE_SLOPE;
            case CORNER -> SHAPE_CORNER;
        };
    }

    @Nullable
    @Override
    public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
        return new LegoBlockTileEntity(pos, state, brickType);
    }

    public BrickType getBrickType() {
        return brickType;
    }

    private static VoxelShape createStudsForShape(int width, int length) {
        VoxelShape shape = Shapes.empty();
        double studSize = 0.25;
        double studHeight = 0.3;
        double studSpacing = 0.5;
        
        for (int i = 0; i < width; i++) {
            for (int j = 0; j < length; j++) {
                double x1 = 0.125 + i * studSpacing;
                double z1 = 0.125 + j * studSpacing;
                double x2 = x1 + studSize;
                double z2 = z1 + studSize;
                
                VoxelShape stud = Shapes.box(x1, 0.6, z1, x2, 0.6 + studHeight, z2);
                shape = Shapes.join(shape, stud, BooleanOp.OR);
            }
        }
        
        return shape;
    }
}
